import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';

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
}
