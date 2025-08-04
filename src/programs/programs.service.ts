import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { FollowPaidProgramsDto, ProgramsQuery } from './programs.dto';

@Injectable()
export class ProgramsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getProgramsFiltered(req: Request, query: ProgramsQuery) {
    const default_page = 1;
    const take = 6;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = { is_active: true };
    if (query.q) {
      where.OR = [
        { program_id: { contains: query.q } },
        { title: { contains: query.q } },
      ];
    }

    if (query.type) {
      where.type = query.type;
    }

    const [total_programs, programs] = await this.prisma.$transaction([
      this.prisma.program.count({ where }),
      this.prisma.program.findMany({
        where,
        select: {
          program_id: true,
          title: true,
          type: true,
          price: true,
          participants: {
            select: {
              user_id: true,
              is_approved: true,
            },
          },
          _count: {
            select: {
              details: true,
            },
          },
        },
        take,
        skip,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      programs: programs.map((program) => {
        const { _count, participants, ...rest } = program;

        return {
          ...rest,
          total_tests: _count.details,
          is_approved: req.is_login
            ? participants.some(
                (p) => p.user_id === req.user.user_id && p.is_approved,
              )
            : false,
        };
      }),
      page,
      total_programs,
      total_pages: Math.ceil(total_programs / take),
      is_login: req.is_login,
    };
  }

  async getProgram(req: Request, program_id: string) {
    const program = await this.prisma.program.findFirst({
      where: {
        program_id,
        is_active: true,
      },
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
        qr_code: true,
        url_qr_code: true,
        details: {
          where: {
            test: {
              is_active: true,
            },
          },
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
                    user_id: req.is_login ? req.user.user_id : '',
                  },
                  select: {
                    user_id: true,
                    result_id: true,
                    score: true,
                  },
                },
              },
            },
          },
        },
        participants: req.is_login
          ? {
              select: {
                user_id: true,
                is_approved: true,
              },
            }
          : {},
      },
    });

    if (!program) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const { details, participants, ...rest } = program;

    return {
      ...rest,
      total_tests: details.length,
      is_approved: req.is_login
        ? participants.some(
            (p) => p.user_id === req.user.user_id && p.is_approved,
          )
        : false,
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
          remaining_tests: 3 - results.length,
          result_id: Boolean(results.length) ? results[0].result_id : null,
          status,
        };
      }),
      is_login: req.is_login,
    };
  }

  async followPaidProgram(body: FollowPaidProgramsDto, user_id: string) {
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
        is_approved: true,
      },
    });

    return {
      program_id: body.program_id,
      user_id,
    };
  }

  async followFreeProgram(body: {
    user_id: string;
    program_id: string;
    files: Array<Express.Multer.File>;
  }) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const transactions = [];

    if (body.files.length) {
      const urls: string[] = [];

      for (const file of body.files) {
        urls.push(
          await this.storage.uploadFile({
            buffer: file.buffer,
            key: `users/programs/${Date.now()}-${file.originalname}`,
            mimetype: file.mimetype,
          }),
        );
      }

      transactions.push(
        this.prisma.socialMediaImage.createMany({
          data: urls.map((url) => {
            return {
              program_id: body.program_id,
              user_id: body.user_id,
              url,
            };
          }),
        }),
      );
    }

    const date = new Date();

    await this.prisma.$transaction([
      this.prisma.participant.create({
        data: {
          program_id: body.program_id,
          user_id: body.user_id,
          is_approved: true,
          joined_at: date,
        },
      }),
      ...transactions,
    ]);

    return {
      program_id: body.program_id,
      user_id: body.user_id,
    };
  }
}
