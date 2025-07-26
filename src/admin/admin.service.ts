import { MailerService } from '@nestjs-modules/mailer';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassMentorType } from '@prisma/client';
import { AxiosResponse } from 'axios';
import { random } from 'lodash';
import { DateTime } from 'luxon';
import { firstValueFrom, Observable } from 'rxjs';
import ShortUniqueId from 'short-unique-id';
import { hashPassword } from '../utils/bcrypt.util';
import { decryptString, encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import {
  generateEmailTemplate,
  generateInvoiceNumberCustom,
  maskEmail,
  maskPhoneNumber,
  parseSortQuery,
  scoreCategory,
  slug,
} from '../utils/string.util';
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
  UpdateSubjectPrivateDto,
  UpdateTestsDto,
  UpdateUserDto,
} from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private readonly http: HttpService,
    private readonly storage: StorageService,
    private mailerService: MailerService,
  ) {}

  async getDashboard() {
    const [
      total_users,
      total_online_users,
      total_programs,
      total_tests,
      exchange_rates,
      credits,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.session.count(),
      this.prisma.program.count(),
      this.prisma.test.count(),
      firstValueFrom(
        this.http.get('https://open.er-api.com/v6/latest/usd') as Observable<
          AxiosResponse<{ rates: { IDR: number } }>
        >,
      ),
      firstValueFrom(
        this.http.get(`${process.env.PROVIDER_URL}/api/v1/credits`, {
          headers: {
            Authorization: `Bearer ${process.env.PROVIDER_CREDIT_KEY}`,
          },
        }) as Observable<
          AxiosResponse<{
            data: { total_credits: number; total_usage: number };
          }>
        >,
      ),
    ]);

    return {
      total_users,
      total_online_users,
      total_programs,
      total_tests,
      ...credits.data.data,
      remaining_credits:
        credits.data.data.total_credits - credits.data.data.total_usage,
      usd_to_idr_rate: Math.round(exchange_rates.data.rates.IDR),
    };
  }

  async getUsersFiltered(query: AdminQuery, role: string) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_users, users] = await this.prisma.$transaction([
      this.prisma.user.count({
        where,
      }),
      this.prisma.user.findMany({
        where,
        select: {
          user_id: true,
          fullname: true,
          university: true,
          phone_number: true,
          email: true,
          is_verified: true,
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
      page,
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
        is_verified: true,
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

  async getSessionsFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_sessions, sessions] = await this.prisma.$transaction([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({
        where,
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
      page,
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

  async getProgramsFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 9;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    where.is_active = query.filter === 'inactive' ? false : true;

    if (query.filter === 'free' || query.filter === 'paid') {
      where.type = query.filter;
    }

    if (query.q) {
      where.OR = [
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
      ];
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
          created_at: true,
          is_active: true,
          _count: {
            select: {
              details: true,
            },
          },
        },
        take,
        skip,
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
      }),
    ]);

    return {
      programs: programs.map((program) => {
        const { _count, ...rest } = program;

        return {
          ...rest,
          total_tests: _count.details,
        };
      }),
      page,
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
      },
    });

    const { details, ...rest } = program;

    return {
      ...rest,
      total_tests: details.length,
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
    };
  }

  async getProgramParticipants(program_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const participant_where: any = { is_approved: true };

    if (query.q) {
      participant_where.OR = [
        { user: { user_id: { contains: query.q } } },
        { user: { fullname: { contains: query.q } } },
      ];
    }

    const [total_participants, program] = await this.prisma.$transaction([
      this.prisma.participant.count({
        where: {
          program_id,
          ...participant_where,
        },
      }),
      this.prisma.program.findUnique({
        where: { program_id },
        select: {
          program_id: true,
          title: true,
          type: true,
          participants: {
            where: participant_where,
            select: {
              user: {
                select: {
                  user_id: true,
                  fullname: true,
                  university: true,
                },
              },
              joined_at: true,
              is_approved: true,
            },
            take,
            skip,
            orderBy: query.sort
              ? parseSortQuery(query.sort, ['joined_at'])
              : { joined_at: 'desc' },
          },
        },
      }),
    ]);

    if (!program) {
      return {};
    }

    const { participants, ...rest } = program;

    return {
      ...rest,
      participants: participants.map(({ user, ...rest }) => ({
        ...user,
        ...rest,
      })),
      page,
      total_participants,
      total_pages: Math.ceil(total_participants / take),
    };
  }

  async createProgram(body: CreateProgramsDto, file: Express.Multer.File) {
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
        qr_code: file
          ? await this.storage.uploadFile({
              key: `qr/${Date.now()}-${file.originalname}`,
              buffer: file.buffer,
              mimetype: file.mimetype,
            })
          : null,
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

  async updateProgram(body: UpdateProgramsDto, file: Express.Multer.File) {
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
            qr_code: await this.storage.uploadFile({
              key: `qr/${Date.now()}-${file.originalname}`,
              buffer: file.buffer,
              mimetype: file.mimetype,
            }),
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
          qr_code: await this.storage.uploadFile({
            key: `qr/${Date.now()}-${file.originalname}`,
            buffer: file.buffer,
            mimetype: file.mimetype,
          }),
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
    const program = await this.prisma.program.findUnique({
      where: { program_id: body.program_id },
      select: {
        program_id: true,
        title: true,
        price: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Program tidak ditemukan');
    }

    const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    const until = today.plus({ days: 1 });

    const year_format = DateTime.now()
      .setZone('Asia/Jakarta')
      .toFormat('yyyyMMdd');

    const uid = new ShortUniqueId();

    const date = new Date();

    const [users] = await this.prisma.$transaction(async (tx) => {
      await tx.participant.createMany({
        data: body.users.map((user) => {
          return {
            program_id: body.program_id,
            user_id: user,
            invited_at: date,
            invited_by: body.by,
            is_approved: true,
            joined_at: date,
          };
        }),
        skipDuplicates: true,
      });

      const users = await tx.user.findMany({
        where: {
          user_id: {
            in: body.users,
          },
        },
        select: {
          fullname: true,
          email: true,
        },
      });

      for (const user of body.users) {
        const idempotency_key = `${user}-${program.program_id}-${year_format}`;

        const existing_order = await tx.order.findUnique({
          where: { idempotency_key },
          select: { order_id: true },
        });

        if (existing_order) {
          continue;
        }

        const total_order = await tx.order.count({
          where: {
            created_at: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
          },
        });

        const invoice_number = generateInvoiceNumberCustom(
          'INV',
          'RO',
          year_format,
          total_order,
        );

        const transaction_id = `ROTX-${year_format}-${uid.rnd(7).toUpperCase()}`;
        const date = new Date();

        await tx.order.create({
          data: {
            idempotency_key,
            invoice_number,
            order_id: `ROORDER-${year_format}-${uid.rnd(7).toUpperCase()}`,
            user_id: user,
            total_amount: program.price,
            final_amount: program.price,
            paid_amount: program.price,
            discount_amount: 0,
            discount_code: null,
            created_by: body.by,
            updated_by: body.by,
            paid_at: date,
            status: 'paid',
            items: {
              create: {
                product_id: program.program_id,
                product_name: program.title,
                product_type: 'tryout',
                product_price: program.price,
                created_by: body.by,
                updated_by: body.by,
              },
            },
            transactions: {
              create: {
                request_id: idempotency_key,
                transaction_id,
                external_id: transaction_id,
                gateway: 'manual',
                normalized_method: 'manual',
                paid_amount: program.price,
                payment_method: 'manual',
                status: 'success',
                paid_at: date,
                created_by: body.by,
                updated_by: body.by,
              },
            },
          },
        });
      }

      return [users];
    });

    if (process.env.EMAIL_ACTIVE === 'true') {
      const from = `RuangObat <${process.env.EMAIL_ALIAS_TWO}>`;
      const subject = `🎉 Selamat! Kamu sudah bisa mengakses ${program.title}!`;

      for (const user of users) {
        this.mailerService
          .sendMail({
            from,
            subject,
            to: decryptString(user.email, process.env.ENCRYPT_KEY),
            html: generateEmailTemplate({
              env: process.env.NODE_ENV,
              fullname: user.fullname,
              type: ['program'],
              program_name: program.title,
              path: `/programs/${program.program_id}`,
            }),
          })
          .catch((err) => {
            console.error('Failed to send email:', err);
          });
      }
    }

    delete body.by;
    return body;
  }

  async getTestsFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 9;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    where.is_active = query.filter === 'inactive' ? false : true;

    if (query.filter === 'free' || query.filter === 'paid') {
      where.type = query.filter;
    }

    const now = new Date();

    if (query.filter === 'upcoming') {
      where.start = { gt: now };
    } else if (query.filter === 'ongoing') {
      where.start = { lte: now };
      where.end = { gte: now };
    } else if (query.filter === 'ended') {
      where.end = { lt: now };
    }

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_tests, tests] = await this.prisma.$transaction([
      this.prisma.test.count({
        where,
      }),
      this.prisma.test.findMany({
        where,
        select: {
          test_id: true,
          title: true,
          start: true,
          end: true,
          is_active: true,
          duration: true,
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
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

      page,
      total_tests,
      total_pages: Math.ceil(total_tests / take),
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

  async getTest(test_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 20;
    const page = Number(query.page) || default_page;
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
              _count: {
                select: {
                  details: true,
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

    const { questions, ...rest } = test;

    return {
      status,
      ...rest,
      questions: questions.map((question) => {
        const { _count, ...rest } = question;

        return {
          ...rest,
          can_delete: Boolean(!_count.details),
        };
      }),
      page,
      total_questions,
      total_pages: Math.ceil(total_questions / take),
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

  async getResultsTestFiltered(test_id: string, query: AdminQuery) {
    const default_page = 1;
    const take = 15;

    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = { test_id };

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_results, results, test] = await this.prisma.$transaction([
      this.prisma.result.count({ where }),
      this.prisma.result.findMany({
        where,
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

  async getFeedbacksFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 8;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_feedback, feedback] = await this.prisma.$transaction([
      this.prisma.feedback.count({
        where,
      }),
      this.prisma.feedback.findMany({
        where,
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

  async getMentorsFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
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
      ];
    }

    const [total_mentors, mentors] = await this.prisma.$transaction([
      this.prisma.mentor.count({
        where,
      }),
      this.prisma.mentor.findMany({
        where,
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
      page,
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

  async createMentor(body: CreateMentorDto, file: Express.Multer.File) {
    return this.prisma.mentor.create({
      data: {
        mentor_id: `ROM${random(10000, 99999)}`,
        fullname: body.fullname,
        nickname: body.nickname,
        description: body.description,
        mentor_title: body.mentor_title,
        created_by: body.by,
        updated_by: body.by,
        img_url: await this.storage.uploadFile({
          key: `mentors/${Date.now()}-${file.originalname}`,
          buffer: file.buffer,
          mimetype: file.mimetype,
        }),
        is_show: body.is_show === 'true',
      },
      select: {
        mentor_id: true,
      },
    });
  }

  async updateMentor(body: UpdateMentorDto, file: Express.Multer.File) {
    const mentor = await this.prisma.mentor.findUnique({
      where: {
        mentor_id: body.mentor_id,
      },
      select: {
        img_url: true,
      },
    });

    if (!mentor) {
      throw new NotFoundException('Mentor tidak ditemukan');
    }

    if (body.with_image == 'true') {
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
          img_url: await this.storage.uploadFile({
            key: `mentors/${Date.now()}-${file.originalname}`,
            buffer: file.buffer,
            mimetype: file.mimetype,
          }),
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

    return this.prisma.mentor.delete({
      where: {
        mentor_id,
      },
      select: {
        mentor_id: true,
      },
    });
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

  async updateSubjectPrivate(body: UpdateSubjectPrivateDto) {
    if (
      !(await this.prisma.subject.count({
        where: { subject_id: body.subject_id, subject_type: 'private' },
      }))
    ) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    if (!body.subject_parts || !body.subject_parts.length) {
      return this.prisma.subject.update({
        where: {
          subject_id: body.subject_id,
          subject_type: 'private',
        },
        data: {
          title: body.title,
          slug: body.title ? slug(body.title) : undefined,
          subject_type: 'private',
          description: body.description,
          updated_by: body.by,
        },
        select: {
          subject_id: true,
        },
      });
    }

    const promises = [];

    for (const part of body.subject_parts) {
      promises.push(
        this.prisma.subjectPart.upsert({
          where: {
            subject_part_id: part.subject_part_id,
          },
          create: {
            subject_id: body.subject_id,
            subject_part_id: `ROSBJP${random(1000, 9999)}`,
            description: part.description,
            price: part.price,
            link_order: part.link_order,
            created_by: body.by,
            updated_by: body.by,
          },
          update: {
            description: part.description,
            price: part.price,
            link_order: part.link_order,
            updated_by: body.by,
          },
        }),
      );
    }

    await Promise.all(promises);

    return this.prisma.subject.update({
      where: {
        subject_id: body.subject_id,
        subject_type: 'private',
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        subject_type: 'private',
        description: body.description,
        updated_by: body.by,
      },
      select: {
        subject_id: true,
      },
    });
  }

  async getSubjectPrivateFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {
      subject_type: 'private',
    };

    if (query.q) {
      where.OR = [
        {
          title: {
            contains: query.q,
          },
        },
      ];
    }

    const [total_private_classes, private_classes] =
      await this.prisma.$transaction([
        this.prisma.subject.count({
          where,
        }),
        this.prisma.subject.findMany({
          where,
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
      page,
      total_private_classes,
      total_pages: Math.ceil(total_private_classes / take),
    };
  }

  getSubjectPrivateById(subject_id: string) {
    return this.prisma.subject.findUnique({
      where: {
        subject_id,
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
            created_at: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
      },
    });
  }

  async deleteSubjectPrivate(subject_id: string) {
    const subject = await this.prisma.subject.count({
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

  async deleteSubjectPartPrivate(subject_id: string, subject_part_id: string) {
    const subject = await this.prisma.subject.count({
      where: {
        subject_type: 'private',
        subject_id,
      },
    });

    if (!subject) {
      throw new NotFoundException('Kelas tidak ditemukan');
    }

    const subject_part = await this.prisma.subjectPart.count({
      where: {
        subject_part_id,
      },
    });

    if (!subject_part) {
      throw new NotFoundException('Produk tidak ditemukan');
    }

    return this.prisma.subjectPart.delete({
      where: {
        subject_part_id,
      },
      select: {
        subject_part_id: true,
      },
    });
  }

  async getThesesFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
        {
          title: {
            contains: query.q,
          },
        },
      ];
    }

    const [total_theses, theses] = await this.prisma.$transaction([
      this.prisma.thesis.count({
        where,
      }),
      this.prisma.thesis.findMany({
        where,
        select: {
          thesis_id: true,
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
      theses,
      page,
      total_theses,
      total_pages: Math.ceil(total_theses / take),
    };
  }

  getThesesById(thesis_id: string) {
    return this.prisma.thesis.findUnique({
      where: {
        thesis_id,
      },
      select: {
        thesis_id: true,
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
    });
  }

  async createTheses(body: CreateProductSharedDto, file: Express.Multer.File) {
    if (body.thumbnail_type == 'image') {
      return this.prisma.thesis.create({
        data: {
          thesis_id: `ROTHE${random(10000, 99999)}`,
          title: body.title,
          slug: slug(body.title),
          link_order: body.link_order,
          description: body.description,
          price: parseInt(body.price),
          thumbnail_url: await this.storage.uploadFile({
            key: `theses/${Date.now()}-${file.originalname}`,
            buffer: file.buffer,
            mimetype: file.mimetype,
          }),
          thumbnail_type: 'image',
          created_by: body.by,
          updated_by: body.by,
        },
        select: {
          thesis_id: true,
        },
      });
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

    return this.prisma.thesis.delete({
      where: {
        thesis_id,
      },
      select: {
        thesis_id: true,
      },
    });
  }

  async updateTheses(body: UpdateProductSharedDto, file: Express.Multer.File) {
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
            thumbnail_url: await this.storage.uploadFile({
              key: `theses/${Date.now()}-${file.originalname}`,
              buffer: file.buffer,
              mimetype: file.mimetype,
            }),
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

  async getResearchFiltered(query: AdminQuery) {
    const default_page = 1;
    const take = 15;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
        {
          title: {
            contains: query.q,
          },
        },
      ];
    }

    const [total_research, research] = await this.prisma.$transaction([
      this.prisma.research.count({
        where,
      }),
      this.prisma.research.findMany({
        where,
        select: {
          research_id: true,
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
      research,
      page,
      total_research,
      total_pages: Math.ceil(total_research / take),
    };
  }

  getResearchById(research_id: string) {
    return this.prisma.research.findUnique({
      where: {
        research_id,
      },
      select: {
        research_id: true,
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
    });
  }

  async createResearch(
    body: CreateProductSharedDto,
    file: Express.Multer.File,
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
          thumbnail_url: await this.storage.uploadFile({
            key: `research/${Date.now()}-${file.originalname}`,
            buffer: file.buffer,
            mimetype: file.mimetype,
          }),
          thumbnail_type: 'image',
          created_by: body.by,
          updated_by: body.by,
        },
        select: {
          research_id: true,
        },
      });
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
            thumbnail_url: await this.storage.uploadFile({
              key: `research/${Date.now()}-${file.originalname}`,
              buffer: file.buffer,
              mimetype: file.mimetype,
            }),
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
    const promises = [];

    for (const mentor of body.mentors) {
      promises.push(
        this.prisma.classMentor.create({
          data: {
            class_mentor_id: `ROCM${random(10000, 99999)}`,
            mentor_id: mentor,
            type: body.type,
            created_by: body.by,
            updated_by: body.by,
          },
        }),
      );
    }

    await Promise.all(promises);

    return body.mentors;
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
