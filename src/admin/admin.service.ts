import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptString } from '../utils/crypto.util';
import { maskEmail, maskPhoneNumber } from '../utils/masking.util';
import { PrismaService } from '../utils/services/prisma.service';
import { AdminQuery } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [total_users, total_online_users, total_programs, total_tests] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.session.count(),
        this.prisma.program.count(),
        this.prisma.test.count(),
      ]);

    return {
      total_users,
      total_online_users,
      total_programs,
      total_tests,
    };
  }

  async getUsers(query: AdminQuery) {
    const default_page = 1;
    const take = 8;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        select: {
          user_id: true,
          fullname: true,
          university: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      users,
      page: query.page,
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getUser(user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        fullname: true,
        email: true,
        phone_number: true,
        gender: true,
        university: true,
        created_at: true,
      },
    });

    return {
      ...user,
      email: maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
      phone_number: maskPhoneNumber(
        decryptString(user.phone_number, process.env.ENCRYPT_KEY),
      ),
    };
  }

  async searchUsers(query: AdminQuery) {
    const default_page = 1;
    const take = 8;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.user.count({
        where: {
          OR: [
            {
              user_id: {
                contains: query.q,
              },
            },
            {
              fullname: {
                contains: query.q,
              },
            },
          ],
        },
      }),
      this.prisma.user.findMany({
        where: {
          OR: [
            {
              user_id: {
                contains: query.q,
              },
            },
            {
              fullname: {
                contains: query.q,
              },
            },
          ],
        },
        select: {
          user_id: true,
          fullname: true,
          university: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      users,
      page: query.page,
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getSessions() {
    const sessions = await this.prisma.session.findMany({
      select: {
        user: {
          select: {
            user_id: true,
            fullname: true,
            university: true,
          },
        },
        browser: true,
        os: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return sessions.map((session) => {
      const { user, ...all } = session;

      return {
        ...user,
        ...all,
      };
    });
  }

  async unfollowUsers(program_id: string, user_id: string) {
    if (!(await this.prisma.program.count({ where: { program_id } }))) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    if (!(await this.prisma.user.count({ where: { user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const program = await this.prisma.programDetail.findMany({
      where: { program_id },
      select: {
        test_id: true,
      },
    });

    const tests = program.map((test) => test.test_id);

    await this.prisma.$transaction([
      this.prisma.result.deleteMany({
        where: {
          test_id: {
            in: tests,
          },
          user_id,
        },
      }),
      this.prisma.participant.deleteMany({ where: { program_id, user_id } }),
    ]);

    return { program_id, user_id };
  }

  async getPrograms(query: AdminQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_programs, programs] = await this.prisma.$transaction([
      this.prisma.program.count(),
      this.prisma.program.findMany({
        select: {
          program_id: true,
          title: true,
          type: true,
          price: true,
          created_at: true,
          is_active: true,
          details: {
            select: {
              test_id: true,
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
        const { details, ...all } = program;

        return {
          ...all,
          total_tests: details.length,
        };
      }),
      page: query.page,
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async getProgramsBySearch(query: AdminQuery) {
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
        },
        select: {
          program_id: true,
          title: true,
          type: true,
          price: true,
          created_at: true,
          is_active: true,
          details: {
            select: {
              test_id: true,
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
        const { details, ...all } = program;

        return {
          ...all,
          total_tests: details.length,
        };
      }),
      page: query.page,
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async getProgram(program_id: string) {
    const program = await this.prisma.program.findUnique({
      where: {
        program_id,
      },
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
        is_active: true,
        details: {
          select: {
            test: {
              select: {
                test_id: true,
                title: true,
                start: true,
                end: true,
                duration: true,
              },
            },
          },
        },
        participants: {
          select: {
            user: {
              select: {
                user_id: true,
                fullname: true,
                university: true,
              },
            },
            code: true,
            joined_at: true,
          },
          orderBy: {
            joined_at: 'desc',
          },
        },
      },
    });

    const { details, participants, ...all } = program;

    return {
      ...all,
      total_tests: details.length,
      total_users: participants.length,
      tests: details.map((detail) => {
        const now = new Date();

        const start = new Date(detail.test.start);
        const end = new Date(detail.test.end);

        let status = '';

        if (now < start) {
          status += 'Belum dimulai';
        } else if (now >= start && now <= end) {
          status += 'Berlangsung';
        } else {
          status += 'Berakhir';
        }

        return {
          ...detail.test,
          status,
        };
      }),
      participants: participants.map((participant) => {
        const { user, ...all } = participant;

        return {
          ...user,
          ...all,
        };
      }),
    };
  }
}
