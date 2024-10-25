import { Injectable, NotFoundException } from '@nestjs/common';
import { random } from 'lodash';
import path from 'path';
import ShortUniqueId from 'short-unique-id';
import { decryptString } from '../utils/crypto.util';
import { maskEmail, maskPhoneNumber } from '../utils/masking.util';
import { PrismaService } from '../utils/services/prisma.service';
import {
  AdminQuery,
  ApprovedUserDto,
  CreateProgramsDto,
  CreateTestsDto,
  InviteUsersDto,
  UpdateProgramsDto,
  UpdateStatusProgramsDto,
  UpdateStatusTestsDto,
  UpdateTestsDto,
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

  async getUsers(query: AdminQuery) {
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
      page: parseInt(query.page),
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
      page: parseInt(query.page),
      total_programs,
      total_pages: Math.ceil(total_programs / take),
    };
  }

  async createPrograms(
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

  async updatePrograms(
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

  async getProgram(program_id: string) {
    const [program, total_users] = await this.prisma.$transaction([
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
            orderBy: {
              joined_at: 'asc',
            },
          },
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
      total_tests: details.length,
      total_users,
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

  async createTests(body: CreateTestsDto) {
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

  async getTest(test_id: string) {
    const test = await this.prisma.test.findUnique({
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
            options: {
              select: {
                text: true,
                option_id: true,
                is_correct: true,
              },
            },
          },
          orderBy: { number: 'asc' },
        },
      },
    });

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
      total_questions: test.questions.length,
      ...test,
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

  async updateStatusTests(body: UpdateStatusTestsDto) {
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

  async updateTests(body: UpdateTestsDto) {
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

  async getResultsTest(test_id: string) {
    const results = await this.prisma.result.findMany({
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
    });

    return results.map((result) => {
      const { score, user, result_id } = result;
      return {
        result_id,
        ...user,
        score,
      };
    });
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

  getUsersImages(params: { program_id: string; user_id: string }) {
    return this.prisma.socialMediaImage.findMany({
      where: {
        program_id: params.program_id,
        user_id: params.user_id,
      },
      select: {
        url: true,
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

  async getFeedback(query: AdminQuery) {
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

  async getFeedbackBySearch(query: AdminQuery) {
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
}
