import { Injectable } from '@nestjs/common';
import { decryptString } from 'src/utils/crypto.util';
import { maskEmail } from 'src/utils/masking.util';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}

  async getProfile(user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id },
      select: {
        fullname: true,
        email: true,
        phone_number: true,
        gender: true,
        university: true,
      },
    });

    return {
      ...user,
      email: maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
      phone_number: maskEmail(
        decryptString(user.phone_number, process.env.ENCRYPT_KEY),
      ),
    };
  }

  async getPrograms(user_id: string) {
    const programs = await this.prisma.participant.findMany({
      select: {
        program: {
          select: {
            program_id: true,
            title: true,
            type: true,
            price: true,
            participants: {
              where: {
                joined_at: {
                  not: null,
                },
                is_approved: true,
              },
              select: {
                user_id: true,
              },
            },
          },
        },
      },
      where: {
        user_id,
        joined_at: {
          not: null,
        },
        is_approved: true,
      },
      orderBy: {
        joined_at: 'desc',
      },
    });

    return programs.map((program) => {
      const { participants, ...all } = program.program;
      return {
        ...all,
        total_users: participants.length,
      };
    });
  }

  async getTests(user_id: string) {
    const tests = await this.prisma.result.findMany({
      where: {
        user_id,
      },
      select: {
        test: {
          select: {
            title: true,
            test_id: true,
          },
        },
        result_id: true,
        score: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => {
      return {
        ...test.test,
        result_id: test.result_id,
        score: test.score,
        created_at: test.created_at,
      };
    });
  }
}
