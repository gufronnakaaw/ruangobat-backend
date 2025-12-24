import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { random } from 'lodash';
import { removeKeys, shuffle } from '../utils/array.util';
import { PrismaService } from '../utils/services/prisma.service';
import { scoreCategory } from '../utils/string.util';
import { FinishTestsDto, StartTestQuestion } from './tests.dto';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async getTest(test_id: string, user_id: string) {
    const [test, start_test, result] = await this.prisma.$transaction([
      this.prisma.test.findUnique({
        where: {
          test_id,
          is_active: true,
        },
        select: {
          test_id: true,
          title: true,
          description: true,
          start: true,
          end: true,
          duration: true,
          questions: {
            select: {
              question_id: true,
            },
          },
        },
      }),
      this.prisma.start.findUnique({
        where: {
          user_id_test_id: {
            user_id,
            test_id,
          },
        },
        select: {
          end_time: true,
        },
      }),
      this.prisma.result.findMany({
        where: {
          user_id,
          test_id,
        },
        select: {
          result_id: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    if (!test) {
      throw new NotFoundException('Test tidak ada');
    }

    let status = '';
    const { questions, ...rest } = test;

    const now = new Date();

    const start = new Date(test.start);
    const end = new Date(test.end);

    if (now < start) {
      status += 'Belum dimulai';
    } else if (now >= start && now <= end) {
      status += 'Berlangsung';
    } else {
      status += 'Berakhir';
    }

    return {
      ...rest,
      total_questions: questions.length,
      has_start: start_test ? true : false,
      has_result: Boolean(result.length) ? result[0].result_id : false,
      remaining_tests: 3 - result.length,
      end_time: start_test ? start_test.end_time : null,
      status,
    };
  }

  async startTest({
    test,
    user_id,
    questions,
  }: {
    test: { test_id: string; duration: number };
    user_id: string;
    questions: StartTestQuestion[];
  }) {
    const start = await this.prisma.start.findUnique({
      where: {
        user_id_test_id: {
          test_id: test.test_id,
          user_id,
        },
      },
      select: {
        end_time: true,
      },
    });

    const shuffles = shuffle(questions).map((question, index) => {
      return {
        number: index + 1,
        ...question,
        user_answer: '',
        is_hesitant: false,
      };
    });

    if (start) {
      return {
        questions: shuffles,
        total_questions: questions.length,
        end_time: start.end_time,
        server_time: new Date().toISOString(),
      };
    }

    const date = new Date();
    date.setMinutes(date.getMinutes() + test.duration);
    const end_time = date.toISOString();

    await this.prisma.start.create({
      data: {
        test_id: test.test_id,
        user_id,
        end_time,
      },
    });

    return {
      questions: shuffles,
      total_questions: questions.length,
      end_time,
      server_time: new Date().toISOString(),
    };
  }

  async getQuestions(test_id: string) {
    const questions = await this.prisma.question.findMany({
      where: {
        test_id,
      },
      select: {
        question_id: true,
        text: true,
        url: true,
        type: true,
        options: {
          select: {
            option_id: true,
            text: true,
          },
        },
      },
    });

    if (!questions.length) {
      throw new NotFoundException('Soal tidak ditemukan');
    }

    return questions;
  }

  async validateTestAndUser(test_id: string, user_id: string) {
    const test = await this.prisma.test.findUnique({
      where: {
        test_id,
        is_active: true,
      },
      select: {
        test_id: true,
        duration: true,
        details: {
          select: {
            program_id: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    const has_access = await this.prisma.participant.findFirst({
      where: {
        user_id,
        program_id: {
          in: test.details.map((item) => item.program_id),
        },
      },
    });

    if (!has_access) {
      throw new ForbiddenException('Anda tidak memiliki akses ke test ini');
    }

    return removeKeys(test, ['details']);
  }

  async finishTest(body: FinishTestsDto, user_id: string) {
    const test = await this.validateTestAndUser(body.test_id, user_id);

    const questions = await this.prisma.question.findMany({
      where: {
        test_id: test.test_id,
      },
      select: {
        question_id: true,
        options: {
          select: {
            option_id: true,
            is_correct: true,
          },
          where: {
            is_correct: true,
          },
        },
      },
    });

    if (!questions.length) {
      throw new NotFoundException('Soal tidak ditemukan');
    }

    const start = await this.prisma.start.findUnique({
      where: {
        user_id_test_id: {
          test_id: test.test_id,
          user_id,
        },
      },
      select: {
        end_time: true,
      },
    });

    const transactions = [];

    if (start) {
      transactions.push(
        this.prisma.start.delete({
          where: {
            user_id_test_id: {
              test_id: test.test_id,
              user_id,
            },
          },
        }),
      );
    }

    const questions_map = new Map(questions.map((q) => [q.question_id, q]));

    const point = 100 / questions.length;
    let total_correct = 0;
    let total_incorrect = 0;

    const user_questions = body.questions.map((user_question) => {
      const test_question = questions_map.get(user_question.question_id);
      const correct_option = test_question?.options[0]?.option_id || '';
      const is_correct =
        !!user_question.user_answer &&
        test_question?.options.some(
          (opt) => opt.option_id === user_question.user_answer,
        );

      if (is_correct) total_correct += 1;
      else total_incorrect += 1;

      return {
        number: user_question.number,
        question_id: user_question.question_id,
        correct_option,
        user_answer: user_question.user_answer,
        is_correct,
      };
    });

    const [result] = await this.prisma.$transaction([
      this.prisma.result.create({
        data: {
          result_id: `ROR${random(100000, 999999)}`,
          test_id: body.test_id,
          user_id,
          total_correct,
          total_incorrect,
          score: Math.round(total_correct * point),
          details: {
            createMany: {
              data: user_questions,
            },
          },
        },
        select: {
          result_id: true,
        },
      }),
      ...transactions,
    ]);

    return result;
  }

  async getResult({
    result_id,
    user_id,
  }: {
    result_id: string;
    user_id: string;
  }) {
    const result = await this.prisma.result.findUnique({
      where: {
        result_id,
        user_id,
      },
      select: {
        result_id: true,
        score: true,
        total_correct: true,
        total_incorrect: true,
        details: {
          select: {
            number: true,
            correct_option: true,
            user_answer: true,
            is_correct: true,
            questions: {
              select: {
                question_id: true,
                text: true,
                explanation: true,
                type: true,
                url: true,
                options: {
                  select: {
                    option_id: true,
                    text: true,
                    is_correct: true,
                  },
                },
              },
            },
          },
          orderBy: {
            number: 'asc',
          },
        },
      },
    });

    return {
      result_id: result.result_id,
      score: result.score,
      score_category: scoreCategory(result.score),
      total_correct: result.total_correct,
      total_incorrect: result.total_incorrect,
      questions: result.details.map((detail) => {
        return {
          number: detail.number,
          question_id: detail.questions.question_id,
          text: detail.questions.text,
          explanation: detail.questions.explanation,
          type: detail.questions.type,
          url: detail.questions.url,
          options: detail.questions.options,
          correct_option: detail.correct_option,
          user_answer: detail.user_answer,
          is_correct: detail.is_correct,
        };
      }),
    };
  }
}
