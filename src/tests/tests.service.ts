import { Injectable, NotFoundException } from '@nestjs/common';
import { random } from 'lodash';
import { PrismaService } from '../utils/services/prisma.service';
import { shuffle } from '../utils/shuffle';
import { FinishTestsDto, StartTestQuestion } from './tests.dto';

@Injectable()
export class TestsService {
  constructor(private prisma: PrismaService) {}

  async getTest(test_id: string) {
    const test = await this.prisma.test.findUnique({
      where: {
        test_id,
      },
      select: {
        test_id: true,
        title: true,
        description: true,
        start: true,
        end: true,
        duration: true,
        is_active: true,
        questions: {
          select: {
            question_id: true,
          },
        },
      },
    });

    if (!test || !test.is_active) {
      throw new NotFoundException('Test tidak ada');
    }

    let status = '';
    const { questions, ...all } = test;

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
      ...all,
      total_questions: questions.length,
      status,
    };
  }

  async startTest({
    test_id,
    user_id,
    questions,
  }: {
    test_id: string;
    user_id: string;
    questions: StartTestQuestion[];
  }) {
    const test = await this.prisma.test.findUnique({
      where: {
        test_id,
      },
      select: {
        is_active: true,
        duration: true,
      },
    });

    if (!test || !test.is_active) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    const start = await this.prisma.start.findUnique({
      where: {
        user_id_test_id: {
          test_id,
          user_id,
        },
      },
      select: {
        end_time: true,
      },
    });

    const date = new Date();
    date.setMinutes(date.getMinutes() + test.duration);
    const end_time = date.toISOString();

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
      };
    }

    await this.prisma.start.create({
      data: {
        test_id,
        user_id,
        end_time,
      },
    });

    return {
      questions: shuffles,
      total_questions: questions.length,
      end_time,
    };
  }

  async getQuestions(test_id: string) {
    const test = await this.prisma.test.findUnique({
      where: {
        test_id,
      },
      select: {
        is_active: true,
        duration: true,
      },
    });

    if (!test || !test.is_active) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    return this.prisma.question.findMany({
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
  }

  async finishTest(body: FinishTestsDto, user_id: string) {
    const test = await this.prisma.test.findUnique({
      where: { test_id: body.test_id },
      select: {
        questions: {
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
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    const questions = test.questions;
    const total_questions = test.questions.length;
    const point = 100 / total_questions;
    let total_correct = 0;
    let total_incorrect = 0;

    const user_questions: {
      number: number;
      question_id: string;
      correct_option: string;
      user_answer: string;
      is_correct: boolean;
    }[] = [];

    for (const user_question of body.questions) {
      const test_question = questions.find(
        (question) => question.question_id == user_question.question_id,
      );

      const correct_options = test_question.options.map(
        (item) => item.option_id,
      );

      if (user_question.user_answer) {
        if (correct_options.includes(user_question.user_answer)) {
          user_questions.push({
            number: user_question.number,
            question_id: user_question.question_id,
            correct_option: correct_options[0],
            user_answer: user_question.user_answer,
            is_correct: true,
          });

          total_correct += 1;
        } else {
          user_questions.push({
            number: user_question.number,
            question_id: user_question.question_id,
            correct_option: correct_options[0],
            user_answer: user_question.user_answer,
            is_correct: false,
          });

          total_incorrect += 1;
        }
      } else {
        user_questions.push({
          number: user_question.number,
          question_id: user_question.question_id,
          correct_option: correct_options[0],
          user_answer: user_question.user_answer,
          is_correct: false,
        });

        total_incorrect += 1;
      }
    }

    // await this.prisma.start.delete({
    //   where: {
    //     user_id_test_id: {
    //       user_id,
    //       test_id: body.test_id,
    //     },
    //   },
    // });

    console.log(user_questions);

    return this.prisma.result.create({
      data: {
        result_id: `ROR${random(100000, 999999)}`,
        test_id: body.test_id,
        user_id,
        total_correct,
        total_incorrect,
        score: Math.round(total_correct * point),
        details: {
          createMany: {
            data: user_questions.map((item) => {
              return {
                number: item.number,
                question_id: item.question_id,
                correct_option: item.correct_option,
                user_answer: item.user_answer,
                is_correct: item.is_correct,
              };
            }),
          },
        },
      },
    });
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
