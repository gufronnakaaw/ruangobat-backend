import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/utils/services/prisma.service';
import { FollowProgramsDto } from './programs.dto';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async getPrograms(user_id: string) {
    const programs = await this.prisma.program.findMany({
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
        details: {
          select: {
            test_id: true,
          },
        },
        participants: {
          select: {
            user_id: true,
          },
        },
      },
    });

    return programs.map((program) => {
      const { details, participants, ...all } = program;

      return {
        ...all,
        total_tests: details.length,
        total_users: participants.length,
        participated: participants.some(
          (participant) => participant.user_id === user_id,
        ),
      };
    });
  }

  async getProgram(user_id: string, program_id: string) {
    const program = await this.prisma.program.findUnique({
      where: {
        program_id,
      },
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
        details: {
          select: {
            test: {
              select: {
                test_id: true,
                title: true,
                start: true,
                end: true,
                duration: true,
                results: {
                  where: {
                    user_id,
                  },
                  select: {
                    score: true,
                  },
                },
              },
            },
          },
        },
        participants: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const { details, participants, ...all } = program;

    return {
      ...all,
      total_tests: details.length,
      total_users: participants.length,
      participated: participants.some(
        (participant) => participant.user_id === user_id,
      ),
      tests: details.map((detail) => {
        const { results, ...all } = detail.test;

        const now = new Date();

        const start = new Date(all.start);
        const end = new Date(all.end);

        let status = '';

        if (now < start) {
          status += 'Belum dimulai';
        } else if (now >= start && now <= end) {
          status += 'Berlangsung';
        } else {
          status += 'Berakhir';
        }

        return {
          ...all,
          has_result: Boolean(results.length),
          status,
        };
      }),
    };
  }

  async followPrograms(body: FollowProgramsDto, user_id: string) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const date = new Date();

    if (body.type == 'free') {
      return this.prisma.participant.create({
        data: {
          program_id: body.program_id,
          user_id,
          joined_at: date,
        },
        select: {
          program_id: true,
          user_id: true,
        },
      });
    }

    const participant = await this.prisma.participant.findMany({
      where: {
        user_id,
        program_id: body.program_id,
      },
      select: {
        code: true,
      },
    });

    if (!participant.length) {
      throw new ForbiddenException('Anda belum diizinkan mengikuti program');
    }

    if (participant[0].code !== body.code) {
      throw new BadRequestException('Kode akses salah');
    }

    await this.prisma.participant.updateMany({
      where: {
        user_id,
        program_id: body.program_id,
      },
      data: {
        joined_at: date,
      },
    });

    return {
      program_id: body.program_id,
      user_id,
    };
  }
}
