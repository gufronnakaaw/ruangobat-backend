import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { shuffle } from '../utils/shuffle';
import { StartTestQuestion } from './tests.dto';

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
}
