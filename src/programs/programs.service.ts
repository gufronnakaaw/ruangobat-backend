import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import path from 'path';
import { PrismaService } from 'src/utils/services/prisma.service';
import { FollowPaidProgramsDto, ProgramsQuery } from './programs.dto';

@Injectable()
export class ProgramsService {
  constructor(private prisma: PrismaService) {}

  async getPrograms(user_id: string, query: ProgramsQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_programs, programs] = await this.prisma.$transaction([
      this.prisma.program.count({
        where: {
          is_active: true,
        },
      }),
      this.prisma.program.findMany({
        where: {
          is_active: true,
        },
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
            where: {
              joined_at: {
                not: null,
              },
              is_approved: true,
            },
            select: {
              user_id: true,
              is_approved: true,
            },
          },
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      programs: programs.map((program) => {
        const { details, participants, ...all } = program;

        return {
          ...all,
          total_tests: details.length,
          total_users: participants.length,
          is_approved: participants.find(
            (participant) => participant.user_id === user_id,
          ).is_approved,
        };
      }),
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async getProgramsBySearch(user_id: string, query: ProgramsQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_programs, programs] = await this.prisma.$transaction([
      this.prisma.program.count({
        where: {
          OR: [
            {
              program_id: {
                contains: query.q,
              },
            },
            {
              title: {
                contains: query.q,
              },
            },
          ],
          is_active: true,
        },
      }),
      this.prisma.program.findMany({
        where: {
          OR: [
            {
              program_id: {
                contains: query.q,
              },
            },
            {
              title: {
                contains: query.q,
              },
            },
          ],
          is_active: true,
        },
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
            where: {
              joined_at: {
                not: null,
              },
              is_approved: true,
            },
            select: {
              user_id: true,
              is_approved: true,
            },
          },
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      programs: programs.map((program) => {
        const { details, participants, ...all } = program;

        return {
          ...all,
          total_tests: details.length,
          total_users: participants.length,
          is_approved: participants.find(
            (participant) => participant.user_id === user_id,
          ).is_approved,
        };
      }),
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async getProgramsByType(user_id: string, query: ProgramsQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_programs, programs] = await this.prisma.$transaction([
      this.prisma.program.count({
        where: {
          type: query.type,
          is_active: true,
        },
      }),
      this.prisma.program.findMany({
        where: {
          type: query.type,
          is_active: true,
        },
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
            where: {
              joined_at: {
                not: null,
              },
              is_approved: true,
            },
            select: {
              user_id: true,
              is_approved: true,
            },
          },
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      programs: programs.map((program) => {
        const { details, participants, ...all } = program;

        return {
          ...all,
          total_tests: details.length,
          total_users: participants.length,
          is_approved: participants.find(
            (participant) => participant.user_id === user_id,
          ).is_approved,
        };
      }),
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
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
                is_active: true,
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
          where: {
            joined_at: {
              not: null,
            },
            is_approved: true,
          },
          select: {
            user_id: true,
            is_approved: true,
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
      is_approved: participants.find(
        (participant) => participant.user_id === user_id,
      ).is_approved,
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

  async followPaidPrograms(body: FollowPaidProgramsDto, user_id: string) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const date = new Date();

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

    await this.prisma.participant.update({
      where: {
        program_id_user_id: {
          user_id,
          program_id: body.program_id,
        },
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

  async followFreePrograms(body: {
    user_id: string;
    program_id: string;
    fullurl: string;
    files: Array<Express.Multer.File>;
  }) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.participant.create({
        data: {
          program_id: body.program_id,
          user_id: body.user_id,
          is_approved: false,
        },
      }),
      this.prisma.socialMediaImage.createMany({
        data: body.files.map((file) => {
          return {
            program_id: body.program_id,
            user_id: body.user_id,
            url: `${body.fullurl}/${file.path.split(path.sep).join('/')}`,
          };
        }),
      }),
    ]);

    return {
      program_id: body.program_id,
      user_id: body.user_id,
    };
  }
}
