import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassMentorType } from '@prisma/client';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { random } from 'lodash';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import { slug } from 'src/utils/slug.util';
import { hashPassword } from '../utils/bcrypt.util';
import { decryptString, encryptString } from '../utils/crypto.util';
import { maskEmail, maskPhoneNumber } from '../utils/masking.util';
import { scoreCategory } from '../utils/scorecategory';
import { PrismaService } from '../utils/services/prisma.service';
import {
  AdminQuery,
  ApprovedUserDto,
  CreateClassMentorDto,
  CreateMentorDto,
  CreateProductSharedDto,
  CreateProgramsDto,
  CreateSubjectPrivateDto,
  CreateTestsDto,
  InviteUsersDto,
  UpdateMentorDto,
  UpdateProductSharedDto,
  UpdateProgramsDto,
  UpdateStatusProgramsDto,
  UpdateStatusTestsDto,
  UpdateTestsDto,
  UpdateUserDto,
} from './admin.dto';

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

  async getUsers(query: AdminQuery, role: string) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        select: {
          user_id: true,
          fullname: true,
          university: true,
          phone_number: true,
          email: true,
          is_verified: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      users: users.map((user) => {
        return {
          ...user,
          email:
            role === 'superadmin'
              ? decryptString(user.email, process.env.ENCRYPT_KEY)
              : maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
          phone_number:
            role === 'superadmin'
              ? decryptString(user.phone_number, process.env.ENCRYPT_KEY)
              : maskPhoneNumber(
                  decryptString(user.phone_number, process.env.ENCRYPT_KEY),
                ),
        };
      }),
      page: parseInt(query.page),
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        user_id: true,
        fullname: true,
        university: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getUser(user_id: string, role: string) {
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
      email:
        role === 'superadmin'
          ? decryptString(user.email, process.env.ENCRYPT_KEY)
          : maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
      phone_number:
        role === 'superadmin'
          ? decryptString(user.phone_number, process.env.ENCRYPT_KEY)
          : maskPhoneNumber(
              decryptString(user.phone_number, process.env.ENCRYPT_KEY),
            ),
    };
  }

  async getUsersBySearch(query: AdminQuery, role: string) {
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
          phone_number: true,
          email: true,
          is_verified: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      users: users.map((user) => {
        return {
          ...user,
          email:
            role === 'superadmin'
              ? decryptString(user.email, process.env.ENCRYPT_KEY)
              : maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
          phone_number:
            role === 'superadmin'
              ? decryptString(user.phone_number, process.env.ENCRYPT_KEY)
              : maskPhoneNumber(
                  decryptString(user.phone_number, process.env.ENCRYPT_KEY),
                ),
        };
      }),
      page: parseInt(query.page),
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }

  async getSessions(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_sessions, sessions] = await this.prisma.$transaction([
      this.prisma.session.count(),
      this.prisma.session.findMany({
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
          expired: true,
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      sessions: sessions.map((session) => {
        const { user, ...all } = session;

        return {
          ...user,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_sessions,
      total_pages: Math.ceil(total_sessions / take),
    };
  }

  async getSessionsBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_sessions, sessions] = await this.prisma.$transaction([
      this.prisma.session.count({
        where: {
          OR: [
            {
              user_id: {
                contains: query.q,
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
              },
            },
          ],
        },
      }),
      this.prisma.session.findMany({
        where: {
          OR: [
            {
              user_id: {
                contains: query.q,
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
              },
            },
          ],
        },
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
          expired: true,
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      sessions: sessions.map((session) => {
        const { user, ...all } = session;

        return {
          ...user,
          ...all,
        };
      }),
      page: parseInt(query.page),
      total_sessions,
      total_pages: Math.ceil(total_sessions / take),
    };
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
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async createProgram(
    body: CreateProgramsDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    const program = await this.prisma.program.create({
      data: {
        program_id: `ROP${random(100000, 999999)}`,
        title: body.title,
        type: body.type,
        price: parseInt(body.price),
        is_active: true,
        created_by: body.by,
        updated_by: body.by,
        url_qr_code: body.url_qr_code,
        details: {
          createMany: {
            data: body.tests.map((test) => {
              return {
                test_id: test,
              };
            }),
          },
        },
      },
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
        created_at: true,
        is_active: true,
      },
    });

    await this.prisma.program.update({
      where: {
        program_id: program.program_id,
      },
      data: {
        qr_code: `${fullurl}/${file.path.split(path.sep).join('/')}`,
      },
    });

    return program;
  }

  async updateStatusProgram(body: UpdateStatusProgramsDto) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    return this.prisma.program.update({
      where: {
        program_id: body.program_id,
      },
      data: {
        is_active: body.is_active,
      },
      select: {
        program_id: true,
        is_active: true,
      },
    });
  }

  async updateProgram(
    body: UpdateProgramsDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    const program = await this.prisma.program.findUnique({
      where: { program_id: body.program_id },
      select: {
        details: {
          select: {
            test_id: true,
          },
        },
      },
    });

    if (!program) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    if (body.tests.length) {
      await this.prisma.programDetail.deleteMany({
        where: { program_id: body.program_id },
      });

      if (file) {
        await this.prisma.program.update({
          where: {
            program_id: body.program_id,
          },
          data: {
            title: body.title,
            type: body.type,
            price: parseInt(body.price),
            updated_by: body.by,
            qr_code: `${fullurl}/${file.path.split(path.sep).join('/')}`,
            url_qr_code: body.url_qr_code,
            details: {
              createMany: {
                data: body.tests.map((test) => {
                  return {
                    test_id: test,
                  };
                }),
              },
            },
          },
        });
      } else {
        await this.prisma.program.update({
          where: {
            program_id: body.program_id,
          },
          data: {
            title: body.title,
            type: body.type,
            price: parseInt(body.price),
            updated_by: body.by,
            url_qr_code: body.url_qr_code,
            details: {
              createMany: {
                data: body.tests.map((test) => {
                  return {
                    test_id: test,
                  };
                }),
              },
            },
          },
        });
      }

      return body;
    }

    if (file) {
      await this.prisma.program.update({
        where: {
          program_id: body.program_id,
        },
        data: {
          title: body.title,
          type: body.type,
          price: parseInt(body.price),
          updated_by: body.by,
          qr_code: `${fullurl}/${file.path.split(path.sep).join('/')}`,
          url_qr_code: body.url_qr_code,
        },
      });
    } else {
      await this.prisma.program.update({
        where: {
          program_id: body.program_id,
        },
        data: {
          title: body.title,
          type: body.type,
          price: parseInt(body.price),
          updated_by: body.by,
          url_qr_code: body.url_qr_code,
        },
      });
    }

    return body;
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
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async getProgram(program_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [program, total_participants, total_users, total_approved_users] =
      await this.prisma.$transaction([
        this.prisma.program.findUnique({
          where: {
            program_id,
          },
          select: {
            program_id: true,
            title: true,
            type: true,
            price: true,
            is_active: true,
            qr_code: true,
            url_qr_code: true,
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
                is_approved: true,
              },
              take,
              skip,
              orderBy: {
                joined_at: 'asc',
              },
            },
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
            joined_at: {
              not: null,
            },
            is_approved: true,
          },
        }),
      ]);

    const { details, participants, ...all } = program;

    return {
      ...all,
      page: parseInt(query.page),
      total_tests: details.length,
      total_users,
      total_participants,
      total_approved_users,
      total_pages: Math.ceil(total_users / take),
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

  async getProgramParticipantsBySearch(program_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [program, total_participants, total_users, total_approved_users] =
      await this.prisma.$transaction([
        this.prisma.program.findUnique({
          where: {
            program_id,
          },
          select: {
            program_id: true,
            title: true,
            type: true,
            price: true,
            is_active: true,
            qr_code: true,
            url_qr_code: true,
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
                  },
                },
              },
            },
            participants: {
              where: {
                OR: [
                  {
                    user: {
                      user_id: {
                        contains: query.q,
                      },
                    },
                  },
                  {
                    user: {
                      fullname: {
                        contains: query.q,
                      },
                    },
                  },
                ],
              },
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
                is_approved: true,
              },
              take,
              skip,
              orderBy: {
                joined_at: 'asc',
              },
            },
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
            OR: [
              {
                user: {
                  user_id: {
                    contains: query.q,
                  },
                },
              },
              {
                user: {
                  fullname: {
                    contains: query.q,
                  },
                },
              },
            ],
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
          },
        }),
        this.prisma.participant.count({
          where: {
            program_id,
            joined_at: {
              not: null,
            },
            is_approved: true,
          },
        }),
      ]);

    const { details, participants, ...all } = program;

    return {
      ...all,
      page: parseInt(query.page),
      total_tests: details.length,
      total_users,
      total_participants,
      total_approved_users,
      total_pages: Math.ceil(total_participants / take),
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

  async deleteProgram(program_id: string) {
    if (!(await this.prisma.program.count({ where: { program_id } }))) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.socialMediaImage.deleteMany({ where: { program_id } }),
      this.prisma.participant.deleteMany({ where: { program_id } }),
      this.prisma.program.delete({ where: { program_id } }),
    ]);

    return { program_id };
  }

  async createTest(body: CreateTestsDto) {
    const test_id = `ROT${random(100000, 999999)}`;
    const uid = new ShortUniqueId({ length: 6 });

    const promises = [];

    for (const [index, question] of body.questions.entries()) {
      const question_id = `ROQ${uid.rnd().toUpperCase()}`;

      promises.push(
        this.prisma.question.create({
          data: {
            question_id,
            test_id,
            type: question.type,
            url: question.url,
            explanation: question.explanation,
            number: question.number ? question.number : index + 1,
            text: question.text,
            created_by: body.by,
            updated_by: body.by,
            options: {
              createMany: {
                data: question.options.map((option) => {
                  const option_id = `ROO${uid.rnd().toUpperCase()}`;

                  return {
                    option_id,
                    text: option.text,
                    is_correct: option.is_correct,
                    created_by: body.by,
                    updated_by: body.by,
                  };
                }),
              },
            },
          },
        }),
      );
    }

    await this.prisma.test.create({
      data: {
        test_id,
        title: body.title,
        description: body.description,
        start: body.start,
        end: body.end,
        duration: body.duration,
        created_by: body.by,
        updated_by: body.by,
      },
    });

    await Promise.all(promises);

    return {
      test_id,
    };
  }

  async inviteUsers(body: InviteUsersDto) {
    if (
      !(await this.prisma.program.count({
        where: { program_id: body.program_id },
      }))
    ) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const date = new Date();

    await this.prisma.participant.createMany({
      data: body.users.map((user) => {
        return {
          program_id: body.program_id,
          user_id: user,
          code: `ROC${random(100000, 999999)}`,
          invited_at: date,
          invited_by: body.by,
          is_approved: null,
        };
      }),
    });

    delete body.by;

    return body;
  }

  async getTests(query: AdminQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_tests, tests] = await this.prisma.$transaction([
      this.prisma.test.count(),
      this.prisma.test.findMany({
        select: {
          test_id: true,
          title: true,
          start: true,
          end: true,
          is_active: true,
          duration: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      tests: tests.map((test) => {
        const now = new Date();

        const start = new Date(test.start);
        const end = new Date(test.end);

        let status = '';

        if (now < start) {
          status += 'Belum dimulai';
        } else if (now >= start && now <= end) {
          status += 'Berlangsung';
        } else {
          status += 'Berakhir';
        }

        return {
          ...test,
          status,
        };
      }),

      page: parseInt(query.page),
      total_tests,
      total_pages: Math.ceil(total_tests / take),
    };
  }

  async getTest(test_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 20;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_questions, test] = await this.prisma.$transaction([
      this.prisma.question.count({ where: { test_id } }),
      this.prisma.test.findUnique({
        where: { test_id },
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
              number: true,
              text: true,
              explanation: true,
              type: true,
              options: {
                select: {
                  text: true,
                  option_id: true,
                  is_correct: true,
                },
              },
            },
            orderBy: { number: 'asc' },
            take,
            skip,
          },
        },
      }),
    ]);

    const now = new Date();

    const start = new Date(test.start);
    const end = new Date(test.end);

    let status = '';

    if (now < start) {
      status += 'Belum dimulai';
    } else if (now >= start && now <= end) {
      status += 'Berlangsung';
    } else {
      status += 'Berakhir';
    }

    return {
      status,
      ...test,
      page: parseInt(query.page),
      total_questions,
      total_pages: Math.ceil(total_questions / take),
    };
  }

  async getAllTests() {
    const tests = await this.prisma.test.findMany({
      select: {
        test_id: true,
        title: true,
        start: true,
        end: true,
        is_active: true,
        duration: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => {
      const now = new Date();

      const start = new Date(test.start);
      const end = new Date(test.end);

      let status = '';

      if (now < start) {
        status += 'Belum dimulai';
      } else if (now >= start && now <= end) {
        status += 'Berlangsung';
      } else {
        status += 'Berakhir';
      }

      return {
        ...test,
        status,
      };
    });
  }

  async getTestsBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 6;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_tests, tests] = await this.prisma.$transaction([
      this.prisma.test.count({
        where: {
          OR: [
            {
              test_id: {
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
      this.prisma.test.findMany({
        where: {
          OR: [
            {
              test_id: {
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
          test_id: true,
          title: true,
          start: true,
          end: true,
          is_active: true,
          duration: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      tests: tests.map((test) => {
        const now = new Date();

        const start = new Date(test.start);
        const end = new Date(test.end);

        let status = '';

        if (now < start) {
          status += 'Belum dimulai';
        } else if (now >= start && now <= end) {
          status += 'Berlangsung';
        } else {
          status += 'Berakhir';
        }

        return {
          ...test,
          status,
        };
      }),

      page: parseInt(query.page),
      total_tests,
      total_pages: Math.ceil(total_tests / take),
    };
  }

  async updateStatusTest(body: UpdateStatusTestsDto) {
    if (
      !(await this.prisma.test.count({
        where: { test_id: body.test_id },
      }))
    ) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    return this.prisma.test.update({
      where: {
        test_id: body.test_id,
      },
      data: {
        is_active: body.is_active,
      },
      select: {
        test_id: true,
        is_active: true,
      },
    });
  }

  async updateTest(body: UpdateTestsDto) {
    const test = await this.prisma.test.count({
      where: { test_id: body.test_id },
    });

    if (!test) {
      throw new NotFoundException('Test tidak ditemukan');
    }

    if (body.update_type === 'update_test') {
      return this.prisma.test.update({
        where: {
          test_id: body.test_id,
        },
        data: {
          title: body.title,
          description: body.description,
          start: body.start,
          end: body.end,
          duration: body.duration,
          updated_by: body.by,
        },
        select: {
          test_id: true,
        },
      });
    }

    if (body.update_type == 'update_question') {
      const promises = [];

      promises.push(
        this.prisma.question.update({
          where: {
            question_id: body.questions[0].question_id,
          },
          data: {
            text: body.questions[0].text,
            explanation: body.questions[0].explanation,
            updated_by: body.by,
          },
        }),
      );

      for (const option of body.questions[0].options) {
        promises.push(
          this.prisma.option.updateMany({
            where: {
              question_id: body.questions[0].question_id,
              option_id: option.option_id,
            },
            data: {
              text: option.text,
              is_correct: option.is_correct,
              updated_by: body.by,
            },
          }),
        );
      }

      await Promise.all(promises);

      return body.questions[0];
    }

    if (body.update_type == 'add_question') {
      const uid = new ShortUniqueId({ length: 6 });
      const count = await this.prisma.question.count({
        where: { test_id: body.test_id },
      });

      const question = body.questions[0];
      const question_id = `ROQ${uid.rnd().toUpperCase()}`;

      return this.prisma.question.create({
        data: {
          question_id,
          test_id: body.test_id,
          type: question.type,
          url: question.url,
          explanation: question.explanation,
          number: count + 1,
          text: question.text,
          created_by: body.by,
          updated_by: body.by,
          options: {
            createMany: {
              data: question.options.map((option) => {
                const option_id = `ROO${uid.rnd().toUpperCase()}`;

                return {
                  option_id,
                  text: option.text,
                  is_correct: option.is_correct,
                  created_by: body.by,
                  updated_by: body.by,
                };
              }),
            },
          },
        },
      });
    }
  }

  async deleteQuestion(params: { test_id: string; question_id: string }) {
    const test = await this.prisma.question.count({
      where: { test_id: params.test_id, question_id: params.question_id },
    });

    if (!test) {
      throw new NotFoundException('Test atau question tidak ditemukan');
    }

    await this.prisma.question.delete({
      where: { test_id: params.test_id, question_id: params.question_id },
    });

    const questions = await this.prisma.question.findMany({
      where: { test_id: params.test_id },
      select: {
        question_id: true,
      },
    });

    const promises = [];

    for (const [index, question] of questions.entries()) {
      promises.push(
        this.prisma.question.update({
          where: {
            test_id: params.test_id,
            question_id: question.question_id,
          },
          data: {
            number: index + 1,
          },
        }),
      );
    }

    await Promise.all(promises);

    return params;
  }

  async getResultsTest(test_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = query.page ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_results, results, test] = await this.prisma.$transaction([
      this.prisma.result.count({ where: { test_id } }),
      this.prisma.result.findMany({
        where: {
          test_id,
        },
        select: {
          result_id: true,
          user: {
            select: {
              user_id: true,
              fullname: true,
              university: true,
            },
          },
          score: true,
        },
        skip,
        take,
        orderBy: {
          score: 'desc',
        },
      }),
      this.prisma.test.findUnique({
        where: { test_id },
        select: {
          test_id: true,
          title: true,
        },
      }),
    ]);

    const program_detail = await this.prisma.programDetail.findMany({
      where: { test_id },
      orderBy: {
        program: {
          created_at: 'desc',
        },
      },
    });

    const total_participants = await this.prisma.participant.count({
      where: {
        program_id: program_detail[0].program_id,
        joined_at: {
          not: null,
        },
        is_approved: true,
      },
    });

    return {
      ...test,
      results: results.map((result) => {
        const { score, user, result_id } = result;
        return {
          result_id,
          ...user,
          score,
          score_category: scoreCategory(score),
        };
      }),
      page,
      total_results,
      total_participants,
      total_pages: Math.ceil(total_results / take),
    };
  }

  async getResultsTestBySearch(test_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = query.page ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_results, results, test] = await this.prisma.$transaction([
      this.prisma.result.count({
        where: {
          test_id,
          OR: [
            {
              user: {
                user_id: {
                  contains: query.q,
                },
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
              },
            },
          ],
        },
      }),
      this.prisma.result.findMany({
        where: {
          test_id,
          OR: [
            {
              user: {
                user_id: {
                  contains: query.q,
                },
              },
            },
            {
              user: {
                fullname: {
                  contains: query.q,
                },
              },
            },
          ],
        },
        select: {
          result_id: true,
          user: {
            select: {
              user_id: true,
              fullname: true,
              university: true,
            },
          },
          score: true,
        },
        skip,
        take,
        orderBy: {
          score: 'desc',
        },
      }),
      this.prisma.test.findUnique({
        where: { test_id },
        select: {
          test_id: true,
          title: true,
        },
      }),
    ]);

    const program_detail = await this.prisma.programDetail.findMany({
      where: { test_id },
      orderBy: {
        program: {
          created_at: 'desc',
        },
      },
    });

    const total_participants = await this.prisma.participant.count({
      where: {
        program_id: program_detail[0].program_id,
        joined_at: {
          not: null,
        },
        is_approved: true,
      },
    });

    return {
      ...test,
      results: results.map((result) => {
        const { score, user, result_id } = result;
        return {
          result_id,
          ...user,
          score,
        };
      }),
      page,
      total_results,
      total_participants,
      total_pages: Math.ceil(total_results / take),
    };
  }

  async getResult(result_id: string) {
    const result = await this.prisma.result.findUnique({
      where: {
        result_id,
      },
      select: {
        result_id: true,
        score: true,
        total_correct: true,
        total_incorrect: true,
        user: {
          select: {
            user_id: true,
            fullname: true,
            university: true,
          },
        },
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
      user_id: result.user.user_id,
      fullname: result.user.fullname,
      university: result.user.university,
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

  async deleteResult(result_id: string) {
    if (!(await this.prisma.result.count({ where: { result_id } }))) {
      throw new NotFoundException('Hasil ujian tidak ditemukan');
    }

    return this.prisma.result.delete({
      where: { result_id },
      select: { result_id: true },
    });
  }

  getUsersImages(params: { program_id: string; user_id: string }) {
    return this.prisma.socialMediaImage.findMany({
      where: {
        program_id: params.program_id,
        user_id: params.user_id,
      },
      select: {
        url: true,
      },
      take: 3,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  approvedUser(body: ApprovedUserDto) {
    return this.prisma.participant.update({
      where: {
        program_id_user_id: {
          program_id: body.program_id,
          user_id: body.user_id,
        },
      },
      data: {
        is_approved: true,
        joined_at: new Date(),
      },
    });
  }

  async getFeedbacks(query: AdminQuery) {
    const default_page = 1;
    const take = 8;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_feedback, feedback] = await this.prisma.$transaction([
      this.prisma.feedback.count(),
      this.prisma.feedback.findMany({
        select: {
          user_id: true,
          fullname: true,
          rating: true,
          text: true,
          created_at: true,
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      feedback,
      page,
      total_feedback,
      total_pages: Math.ceil(total_feedback / take),
    };
  }

  async getFeedbacksBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 8;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_feedback, feedback] = await this.prisma.$transaction([
      this.prisma.feedback.count({
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
      this.prisma.feedback.findMany({
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
          rating: true,
          text: true,
          created_at: true,
        },
        take,
        skip,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      feedback,
      page,
      total_feedback,
      total_pages: Math.ceil(total_feedback / take),
    };
  }

  async updateUser(body: UpdateUserDto) {
    if (
      !(await this.prisma.user.count({
        where: { user_id: body.user_id },
      }))
    ) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (body.type == 'reset') {
      return this.prisma.user.update({
        where: {
          user_id: body.user_id,
        },
        data: {
          password: await hashPassword(process.env.DEFAULT_PASSWORD_USER),
        },
        select: {
          user_id: true,
          fullname: true,
          gender: true,
          university: true,
        },
      });
    }

    if (body.type == 'edit') {
      const users = await this.prisma.user.findMany({
        select: { email: true, phone_number: true },
      });

      const decrypts = users.map((user) => {
        return {
          email: decryptString(user.email, process.env.ENCRYPT_KEY),
          phone_number: decryptString(
            user.phone_number,
            process.env.ENCRYPT_KEY,
          ),
        };
      });

      if (decrypts.find((user) => user.email == body.email)) {
        throw new BadRequestException('Email sudah digunakan');
      }

      if (decrypts.find((user) => user.phone_number == body.phone_number)) {
        throw new BadRequestException('Nomor telepon sudah digunakan');
      }

      return this.prisma.user.update({
        where: {
          user_id: body.user_id,
        },
        data: {
          email: encryptString(body.email, process.env.ENCRYPT_KEY),
          phone_number: encryptString(
            body.phone_number,
            process.env.ENCRYPT_KEY,
          ),
        },
        select: {
          user_id: true,
          fullname: true,
          gender: true,
          university: true,
        },
      });
    }
  }

  async getExportUsersData(role: string) {
    const users = await this.prisma.user.findMany({
      select: {
        user_id: true,
        email: true,
        fullname: true,
        gender: true,
        university: true,
        phone_number: true,
        is_verified: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return users.map((user) => {
      return {
        ...user,
        email:
          role === 'superadmin'
            ? decryptString(user.email, process.env.ENCRYPT_KEY)
            : maskEmail(decryptString(user.email, process.env.ENCRYPT_KEY)),
        phone_number:
          role === 'superadmin'
            ? decryptString(user.phone_number, process.env.ENCRYPT_KEY)
            : maskPhoneNumber(
                decryptString(user.phone_number, process.env.ENCRYPT_KEY),
              ),
      };
    });
  }

  async getExportProgramCodesData(program_id: string) {
    if (!(await this.prisma.program.count({ where: { program_id } }))) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const participants = await this.prisma.participant.findMany({
      where: {
        program_id,
        is_approved: null,
        joined_at: null,
      },
      select: {
        user: {
          select: {
            user_id: true,
            fullname: true,
            university: true,
          },
        },
        code: true,
      },
    });

    return participants.map((participant) => {
      return {
        ...participant.user,
        code: participant.code,
      };
    });
  }

  async getColumns(type: string) {
    if (type == 'users') {
      const columns = [
        { field: 'user_id', translate: 'User ID' },
        { field: 'fullname', translate: 'Nama Lengkap' },
        { field: 'email', translate: 'Email' },
        { field: 'phone_number', translate: 'Nomor Telepon' },
        { field: 'university', translate: 'Asal Kampus' },
        { field: 'gender', translate: 'Jenis Kelamin' },
        { field: 'is_verified', translate: 'Terverifikasi' },
        { field: 'created_at', translate: 'Dibuat pada' },
      ];

      return columns;
    }
  }

  async getMentors(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_mentors, mentors] = await this.prisma.$transaction([
      this.prisma.mentor.count(),
      this.prisma.mentor.findMany({
        select: {
          mentor_id: true,
          fullname: true,
          nickname: true,
          mentor_title: true,
          description: true,
          img_url: true,
          created_at: true,
          is_show: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      mentors,
      page: parseInt(query.page),
      total_mentors,
      total_pages: Math.ceil(total_mentors / take),
    };
  }

  getMentor(mentor_id: string) {
    return this.prisma.mentor.findUnique({
      where: {
        mentor_id,
      },
      select: {
        mentor_id: true,
        fullname: true,
        nickname: true,
        mentor_title: true,
        description: true,
        img_url: true,
        created_at: true,
        is_show: true,
      },
    });
  }

  async getMentorsBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_mentors, mentors] = await this.prisma.$transaction([
      this.prisma.mentor.count({
        where: {
          OR: [
            {
              mentor_id: {
                contains: query.q,
              },
            },
            {
              fullname: {
                contains: query.q,
              },
            },
            {
              nickname: {
                contains: query.q,
              },
            },
            {
              mentor_title: {
                contains: query.q,
              },
            },
          ],
        },
      }),
      this.prisma.mentor.findMany({
        where: {
          OR: [
            {
              mentor_id: {
                contains: query.q,
              },
            },
            {
              fullname: {
                contains: query.q,
              },
            },
            {
              nickname: {
                contains: query.q,
              },
            },
            {
              mentor_title: {
                contains: query.q,
              },
            },
          ],
        },
        select: {
          mentor_id: true,
          fullname: true,
          nickname: true,
          mentor_title: true,
          description: true,
          img_url: true,
          created_at: true,
          is_show: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        take,
        skip,
      }),
    ]);

    return {
      mentors,
      page: parseInt(query.page),
      total_mentors,
      total_pages: Math.ceil(total_mentors / take),
    };
  }

  createMentor(
    body: CreateMentorDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    return this.prisma.mentor.create({
      data: {
        mentor_id: `ROM${random(10000, 99999)}`,
        fullname: body.fullname,
        nickname: body.nickname,
        description: body.description,
        mentor_title: body.mentor_title,
        created_by: body.by,
        updated_by: body.by,
        img_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
        is_show: body.is_show === 'true',
      },
      select: {
        mentor_id: true,
      },
    });
  }

  async updateMentor(
    body: UpdateMentorDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    const mentor = await this.prisma.mentor.findUnique({
      where: {
        mentor_id: body.mentor_id,
      },
      select: {
        img_url: true,
      },
    });

    if (!mentor) {
      if (body.with_image == 'true') {
        if (existsSync(file.path)) {
          await unlink(file.path);
        }
      }
      throw new NotFoundException('Mentor tidak ditemukan');
    }

    if (body.with_image == 'true') {
      const pathname = new URL(mentor.img_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }

      return this.prisma.mentor.update({
        where: {
          mentor_id: body.mentor_id,
        },
        data: {
          fullname: body.fullname,
          nickname: body.nickname,
          description: body.description,
          mentor_title: body.mentor_title,
          updated_by: body.by,
          img_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
          is_show: body.is_show === 'true',
        },
        select: {
          mentor_id: true,
        },
      });
    }

    return this.prisma.mentor.update({
      where: {
        mentor_id: body.mentor_id,
      },
      data: {
        fullname: body.fullname,
        nickname: body.nickname,
        description: body.description,
        mentor_title: body.mentor_title,
        updated_by: body.by,
        is_show: body.is_show === 'true',
      },
      select: {
        mentor_id: true,
      },
    });
  }

  async deleteMentor(mentor_id: string) {
    const mentor = await this.prisma.mentor.findUnique({
      where: {
        mentor_id,
      },
      select: {
        img_url: true,
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor tidak ditemukan');
    }

    const pathname = new URL(mentor.img_url).pathname;
    const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    if (existsSync(file_path)) {
      await unlink(file_path);
    }

    return this.prisma.mentor.delete({
      where: {
        mentor_id,
      },
      select: {
        mentor_id: true,
      },
    });
  }

  async createSubjectPreparation(
    body: CreateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (body.thumbnail_type == 'image') {
      return this.prisma.subject.create({
        data: {
          subject_id: `ROSBJ${random(10000, 99999)}`,
          title: body.title,
          slug: slug(body.title),
          subject_type: 'preparation',
          link_order: body.link_order,
          description: body.description,
          price: parseInt(body.price),
          thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
          thumbnail_type: 'image',
          created_by: body.by,
          updated_by: body.by,
        },
        select: {
          subject_id: true,
        },
      });
    }

    if (file && existsSync(file.path)) {
      await unlink(file.path);
    }

    return this.prisma.subject.create({
      data: {
        subject_id: `ROSBJ${random(10000, 99999)}`,
        title: body.title,
        slug: slug(body.title),
        subject_type: 'preparation',
        link_order: body.link_order,
        description: body.description,
        price: parseInt(body.price),
        thumbnail_url: body.video_url,
        thumbnail_type: 'video',
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        subject_id: true,
      },
    });
  }

  async updateSubjectPreparation(
    body: UpdateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (!body.subject_id) {
      throw new BadRequestException('Kelas ID tidak ditemukan');
    }

    const subject = await this.prisma.subject.findUnique({
      where: {
        subject_type: 'preparation',
        subject_id: body.subject_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (body.thumbnail_type == 'image') {
      if (body.with_image == 'true') {
        if (subject.thumbnail_type == 'image') {
          const pathname = new URL(subject.thumbnail_url).pathname;
          const file_path = pathname.startsWith('/')
            ? pathname.slice(1)
            : pathname;

          if (existsSync(file_path)) {
            await unlink(file_path);
          }
        }

        return this.prisma.subject.update({
          where: {
            subject_type: 'preparation',
            subject_id: body.subject_id,
          },
          data: {
            title: body.title,
            slug: body.title ? slug(body.title) : undefined,
            subject_type: 'preparation',
            link_order: body.link_order,
            description: body.description,
            price: body.price ? parseInt(body.price) : undefined,
            thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
            thumbnail_type: 'image',
            updated_by: body.by,
            is_active: body.is_active == 'true',
          },
          select: {
            subject_id: true,
          },
        });
      }

      return this.prisma.subject.update({
        where: {
          subject_type: 'preparation',
          subject_id: body.subject_id,
        },
        data: {
          title: body.title,
          slug: body.title ? slug(body.title) : undefined,
          subject_type: 'preparation',
          link_order: body.link_order,
          description: body.description,
          price: body.price ? parseInt(body.price) : undefined,
          thumbnail_type: 'image',
          updated_by: body.by,
          is_active: body.is_active == 'true',
        },
        select: {
          subject_id: true,
        },
      });
    }

    if (subject.thumbnail_type == 'image') {
      const pathname = new URL(subject.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }
    }

    return this.prisma.subject.update({
      where: {
        subject_type: 'preparation',
        subject_id: body.subject_id,
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        subject_type: 'preparation',
        link_order: body.link_order,
        description: body.description,
        price: body.price ? parseInt(body.price) : undefined,
        thumbnail_type: 'video',
        thumbnail_url: body.video_url,
        updated_by: body.by,
        is_active: body.is_active == 'true',
      },
      select: {
        subject_id: true,
      },
    });
  }

  async getSubjectPreparation(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_preparation_classes, preparation_classes] =
      await this.prisma.$transaction([
        this.prisma.subject.count({
          where: {
            subject_type: 'preparation',
          },
        }),
        this.prisma.subject.findMany({
          where: {
            subject_type: 'preparation',
          },
          select: {
            subject_id: true,
            title: true,
            description: true,
            slug: true,
            price: true,
            link_order: true,
            thumbnail_url: true,
            thumbnail_type: true,
            is_active: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take,
          skip,
        }),
      ]);

    return {
      preparation_classes,
      page: parseInt(query.page),
      total_preparation_classes,
      total_pages: Math.ceil(total_preparation_classes / take),
    };
  }

  async getSubjectPreparationBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_preparation_classes, preparation_classes] =
      await this.prisma.$transaction([
        this.prisma.subject.count({
          where: {
            subject_type: 'preparation',
            OR: [
              {
                title: {
                  contains: query.q,
                },
              },
            ],
          },
        }),
        this.prisma.subject.findMany({
          where: {
            subject_type: 'preparation',
            OR: [
              {
                title: {
                  contains: query.q,
                },
              },
            ],
          },
          select: {
            subject_id: true,
            title: true,
            description: true,
            slug: true,
            price: true,
            link_order: true,
            thumbnail_url: true,
            thumbnail_type: true,
            is_active: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc',
          },
          take,
          skip,
        }),
      ]);

    return {
      preparation_classes,
      page: parseInt(query.page),
      total_preparation_classes,
      total_pages: Math.ceil(total_preparation_classes / take),
    };
  }

  async createSubjectPrivate(body: CreateSubjectPrivateDto) {
    if (!body.subject_parts.length) {
      throw new BadRequestException('Minimal 1 data');
    }

    return this.prisma.subject.create({
      data: {
        subject_id: `ROSBJ${random(10000, 99999)}`,
        title: body.title,
        slug: slug(body.title),
        subject_type: 'private',
        description: body.description,
        created_by: body.by,
        updated_by: body.by,
        subject_part: {
          create: body.subject_parts.map((part) => {
            return {
              subject_part_id: `ROSBJP${random(1000, 9999)}`,
              description: part.description,
              price: part.price,
              link_order: part.link_order,
              created_by: body.by,
              updated_by: body.by,
            };
          }),
        },
      },
      select: {
        subject_id: true,
      },
    });
  }

  async deleteSubjectPreparation(subject_id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: {
        subject_type: 'preparation',
        subject_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!subject) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (subject.thumbnail_type == 'image') {
      const pathname = new URL(subject.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }

      return this.prisma.subject.delete({
        where: {
          subject_type: 'preparation',
          subject_id,
        },
        select: {
          subject_id: true,
        },
      });
    }

    return this.prisma.subject.delete({
      where: {
        subject_type: 'preparation',
        subject_id,
      },
      select: {
        subject_id: true,
      },
    });
  }

  async getSubjectPrivate(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_private_classes, private_classes] =
      await this.prisma.$transaction([
        this.prisma.subject.count({
          where: {
            subject_type: 'private',
          },
        }),
        this.prisma.subject.findMany({
          where: {
            subject_type: 'private',
          },
          select: {
            subject_id: true,
            title: true,
            description: true,
            slug: true,
            is_active: true,
            created_at: true,
            subject_part: {
              select: {
                subject_part_id: true,
                price: true,
                description: true,
                link_order: true,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take,
          skip,
        }),
      ]);

    return {
      private_classes: private_classes.map((private_class) => {
        const { subject_part, ...all } = private_class;

        return {
          ...all,
          private_sub_classes: subject_part,
        };
      }),
      page: parseInt(query.page),
      total_private_classes,
      total_pages: Math.ceil(total_private_classes / take),
    };
  }

  async getSubjectPrivateBySearch(query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = parseInt(query.page) ? parseInt(query.page) : default_page;

    const skip = (page - 1) * take;

    const [total_private_classes, private_classes] =
      await this.prisma.$transaction([
        this.prisma.subject.count({
          where: {
            subject_type: 'private',
            OR: [
              {
                title: {
                  contains: query.q,
                },
              },
            ],
          },
        }),
        this.prisma.subject.findMany({
          where: {
            subject_type: 'private',
            OR: [
              {
                title: {
                  contains: query.q,
                },
              },
            ],
          },
          select: {
            subject_id: true,
            title: true,
            description: true,
            slug: true,
            is_active: true,
            created_at: true,
            subject_part: {
              select: {
                subject_part_id: true,
                price: true,
                description: true,
                link_order: true,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
          orderBy: {
            created_at: 'desc',
          },
          take,
          skip,
        }),
      ]);

    return {
      private_classes: private_classes.map((private_class) => {
        const { subject_part, ...all } = private_class;

        return {
          ...all,
          private_sub_classes: subject_part,
        };
      }),
      page: parseInt(query.page),
      total_private_classes,
      total_pages: Math.ceil(total_private_classes / take),
    };
  }

  async deleteSubjectPrivate(subject_id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: {
        subject_type: 'private',
        subject_id,
      },
    });

    if (!subject) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    return this.prisma.subject.delete({
      where: {
        subject_type: 'private',
        subject_id,
      },
      select: {
        subject_id: true,
      },
    });
  }

  async createTheses(
    body: CreateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (body.thumbnail_type == 'image') {
      return this.prisma.thesis.create({
        data: {
          thesis_id: `ROTHE${random(10000, 99999)}`,
          title: body.title,
          slug: slug(body.title),
          link_order: body.link_order,
          description: body.description,
          price: parseInt(body.price),
          thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
          thumbnail_type: 'image',
          created_by: body.by,
          updated_by: body.by,
        },
        select: {
          thesis_id: true,
        },
      });
    }

    if (file && existsSync(file.path)) {
      await unlink(file.path);
    }

    return this.prisma.thesis.create({
      data: {
        thesis_id: `ROTHE${random(10000, 99999)}`,
        title: body.title,
        slug: slug(body.title),
        link_order: body.link_order,
        description: body.description,
        price: parseInt(body.price),
        thumbnail_url: body.video_url,
        thumbnail_type: 'video',
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        thesis_id: true,
      },
    });
  }

  async deleteTheses(thesis_id: string) {
    const thesis = await this.prisma.thesis.findUnique({
      where: {
        thesis_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!thesis) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (thesis.thumbnail_type == 'image') {
      const pathname = new URL(thesis.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }

      return this.prisma.thesis.delete({
        where: {
          thesis_id,
        },
        select: {
          thesis_id: true,
        },
      });
    }

    return this.prisma.thesis.delete({
      where: {
        thesis_id,
      },
      select: {
        thesis_id: true,
      },
    });
  }

  async updateTheses(
    body: UpdateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (!body.thesis_id) {
      throw new BadRequestException('Kelas ID tidak ditemukan');
    }

    const thesis = await this.prisma.thesis.findUnique({
      where: {
        thesis_id: body.thesis_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!thesis) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (body.thumbnail_type == 'image') {
      if (body.with_image == 'true') {
        if (thesis.thumbnail_type == 'image') {
          const pathname = new URL(thesis.thumbnail_url).pathname;
          const file_path = pathname.startsWith('/')
            ? pathname.slice(1)
            : pathname;

          if (existsSync(file_path)) {
            await unlink(file_path);
          }
        }

        return this.prisma.thesis.update({
          where: {
            thesis_id: body.thesis_id,
          },
          data: {
            title: body.title,
            slug: body.title ? slug(body.title) : undefined,
            link_order: body.link_order,
            description: body.description,
            price: body.price ? parseInt(body.price) : undefined,
            thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
            thumbnail_type: 'image',
            updated_by: body.by,
            is_active: body.is_active == 'true',
          },
          select: {
            thesis_id: true,
          },
        });
      }

      return this.prisma.thesis.update({
        where: {
          thesis_id: body.thesis_id,
        },
        data: {
          title: body.title,
          slug: body.title ? slug(body.title) : undefined,
          link_order: body.link_order,
          description: body.description,
          price: body.price ? parseInt(body.price) : undefined,
          thumbnail_type: 'image',
          updated_by: body.by,
          is_active: body.is_active == 'true',
        },
        select: {
          thesis_id: true,
        },
      });
    }

    if (thesis.thumbnail_type == 'image') {
      const pathname = new URL(thesis.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }
    }

    return this.prisma.thesis.update({
      where: {
        thesis_id: body.thesis_id,
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        link_order: body.link_order,
        description: body.description,
        price: body.price ? parseInt(body.price) : undefined,
        thumbnail_type: 'video',
        thumbnail_url: body.video_url,
        updated_by: body.by,
        is_active: body.is_active == 'true',
      },
      select: {
        thesis_id: true,
      },
    });
  }

  async createResearch(
    body: CreateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (body.thumbnail_type == 'image') {
      return this.prisma.research.create({
        data: {
          research_id: `RORSCH${random(10000, 99999)}`,
          title: body.title,
          slug: slug(body.title),
          link_order: body.link_order,
          description: body.description,
          price: parseInt(body.price),
          thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
          thumbnail_type: 'image',
          created_by: body.by,
          updated_by: body.by,
        },
        select: {
          research_id: true,
        },
      });
    }

    if (file && existsSync(file.path)) {
      await unlink(file.path);
    }

    return this.prisma.research.create({
      data: {
        research_id: `RORSCH${random(10000, 99999)}`,
        title: body.title,
        slug: slug(body.title),
        link_order: body.link_order,
        description: body.description,
        price: parseInt(body.price),
        thumbnail_url: body.video_url,
        thumbnail_type: 'video',
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        research_id: true,
      },
    });
  }

  async deleteResearch(research_id: string) {
    const research = await this.prisma.research.findUnique({
      where: {
        research_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!research) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (research.thumbnail_type == 'image') {
      const pathname = new URL(research.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }

      return this.prisma.research.delete({
        where: {
          research_id,
        },
        select: {
          research_id: true,
        },
      });
    }

    return this.prisma.research.delete({
      where: {
        research_id,
      },
      select: {
        research_id: true,
      },
    });
  }

  async updateResearch(
    body: UpdateProductSharedDto,
    file: Express.Multer.File,
    fullurl: string,
  ) {
    if (!body.research_id) {
      throw new BadRequestException('Kelas ID tidak ditemukan');
    }

    const research = await this.prisma.research.findUnique({
      where: {
        research_id: body.research_id,
      },
      select: {
        thumbnail_url: true,
        thumbnail_type: true,
      },
    });

    if (!research) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (body.thumbnail_type == 'image') {
      if (body.with_image == 'true') {
        if (research.thumbnail_type == 'image') {
          const pathname = new URL(research.thumbnail_url).pathname;
          const file_path = pathname.startsWith('/')
            ? pathname.slice(1)
            : pathname;

          if (existsSync(file_path)) {
            await unlink(file_path);
          }
        }

        return this.prisma.research.update({
          where: {
            research_id: body.research_id,
          },
          data: {
            title: body.title,
            slug: body.title ? slug(body.title) : undefined,
            link_order: body.link_order,
            description: body.description,
            price: body.price ? parseInt(body.price) : undefined,
            thumbnail_url: `${fullurl}/${file.path.split(path.sep).join('/')}`,
            thumbnail_type: 'image',
            updated_by: body.by,
            is_active: body.is_active == 'true',
          },
          select: {
            research_id: true,
          },
        });
      }

      return this.prisma.research.update({
        where: {
          research_id: body.research_id,
        },
        data: {
          title: body.title,
          slug: body.title ? slug(body.title) : undefined,
          link_order: body.link_order,
          description: body.description,
          price: body.price ? parseInt(body.price) : undefined,
          thumbnail_type: 'image',
          updated_by: body.by,
          is_active: body.is_active == 'true',
        },
        select: {
          research_id: true,
        },
      });
    }

    if (research.thumbnail_type == 'image') {
      const pathname = new URL(research.thumbnail_url).pathname;
      const file_path = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      if (existsSync(file_path)) {
        await unlink(file_path);
      }
    }

    return this.prisma.research.update({
      where: {
        research_id: body.research_id,
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        link_order: body.link_order,
        description: body.description,
        price: body.price ? parseInt(body.price) : undefined,
        thumbnail_type: 'video',
        thumbnail_url: body.video_url,
        updated_by: body.by,
        is_active: body.is_active == 'true',
      },
      select: {
        research_id: true,
      },
    });
  }

  async getClassMentor(type: ClassMentorType) {
    const types = [
      'preparation',
      'private',
      'thesis',
      'research',
      'pharmacist_admission',
    ];

    if (!types.includes(type)) {
      return [];
    }

    const mentors = await this.prisma.classMentor.findMany({
      where: {
        type,
      },
      select: {
        class_mentor_id: true,
        mentor: {
          select: {
            mentor_id: true,
            fullname: true,
            nickname: true,
            mentor_title: true,
            img_url: true,
          },
        },
      },
    });

    return mentors.map((mentor) => {
      return {
        class_mentor_id: mentor.class_mentor_id,
        ...mentor.mentor,
      };
    });
  }

  async createClassMentor(body: CreateClassMentorDto) {
    const mentor = await this.prisma.mentor.count({
      where: { mentor_id: body.mentor_id },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor tidak ditemukan');
    }

    return this.prisma.classMentor.create({
      data: {
        class_mentor_id: `ROCM${random(10000, 99999)}`,
        mentor_id: body.mentor_id,
        type: body.type,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        class_mentor_id: true,
      },
    });
  }

  async deleteClassMentor(class_mentor_id: string) {
    if (
      !(await this.prisma.classMentor.count({ where: { class_mentor_id } }))
    ) {
      throw new NotFoundException('Mentor tidak ditemukan');
    }

    return this.prisma.classMentor.delete({
      where: {
        class_mentor_id,
      },
      select: {
        class_mentor_id: true,
      },
    });
  }
}
