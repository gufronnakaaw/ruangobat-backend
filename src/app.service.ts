import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { $Enums } from '@prisma/client';
import { Request } from 'express';
import { random } from 'lodash';
import ShortUniqueId from 'short-unique-id';
import {
  CreateFeedbackDto,
  CreateUniversityDto,
  FinishAssessmentDto,
  ResetPasswordDto,
  StartAssessmentQuestion,
  UpdateUniversityDto,
  VerifyOtpDto,
} from './app.dto';
import { shuffle } from './utils/array.util';
import { hashPassword } from './utils/bcrypt.util';
import { decryptString } from './utils/crypto.util';
import { PrismaService } from './utils/services/prisma.service';
import { StorageService } from './utils/services/storage.service';
import { parseIsActive, slug } from './utils/string.util';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private jwtService: JwtService,
    private storage: StorageService,
  ) {}

  async createFeedback(body: CreateFeedbackDto) {
    if (!(await this.prisma.user.count({ where: { user_id: body.user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.prisma.feedback.create({
      data: {
        user_id: body.user_id,
        fullname: body.fullname,
        rating: body.rating,
        text: body.text,
        created_at: new Date(),
      },
    });

    return body;
  }

  async sendForgotPasswordOTP(email: string) {
    const users = await this.prisma.user.findMany({
      select: {
        email: true,
        user_id: true,
        fullname: true,
      },
    });

    const decrypts = users.map((user) => {
      return {
        ...user,
        email: decryptString(user.email, process.env.ENCRYPT_KEY),
      };
    });

    const user = decrypts.find((user) => user.email == email);

    if (!user) {
      throw new NotFoundException('Email tidak ditemukan');
    }

    const otp_code = random(100000, 999999);
    const uid = new ShortUniqueId({ length: 10 });
    const expired_at = new Date();
    expired_at.setMinutes(expired_at.getMinutes() + 5);

    const template = `<p>Dear ${user.fullname},</p><p>Please use the one-time password below to authorize your account. It is valid for 5 minutes.</p><p><strong>${otp_code}</strong></p>---<p>Ruang Obat<br><a href="https://ruangobat.id" target="_blank">https://ruangobat.id</a></p>`;

    await Promise.all([
      this.prisma.otp.create({
        data: {
          otp_id: uid.rnd().toUpperCase(),
          otp_code: `${otp_code}`,
          user_id: user.user_id,
          expired_at,
        },
      }),
      this.mailerService.sendMail({
        from: `Ruang Obat <${process.env.EMAIL_ALIAS_ONE}>`,
        to: user.email,
        subject: 'Verification Code (OTP)',
        html: template,
      }),
    ]);

    return {
      user_id: user.user_id,
      message: 'Email terkirim',
    };
  }

  async sendRegistrationOTP(email: string) {
    const otp_code = random(100000, 999999);
    const uid = new ShortUniqueId({ length: 10 });
    const expired_at = new Date();
    expired_at.setMinutes(expired_at.getMinutes() + 5);

    const user_id = `REGISTER${random(100000, 999999)}`;

    const template = `<p>Please use the one-time password below to authorize your account. It is valid for 5 minutes.</p><p><strong>${otp_code}</strong></p>---<p>Ruang Obat<br><a href="https://ruangobat.id" target="_blank">https://ruangobat.id</a></p>`;

    await Promise.all([
      this.prisma.otp.create({
        data: {
          otp_id: uid.rnd().toUpperCase(),
          otp_code: `${otp_code}`,
          user_id,
          expired_at,
        },
      }),
      this.mailerService.sendMail({
        from: `Ruang Obat <${process.env.EMAIL_ALIAS_ONE}>`,
        to: email,
        subject: 'Verification Code (OTP)',
        html: template,
      }),
    ]);

    return {
      user_id,
      message: 'Email terkirim',
    };
  }

  async verifyOtp(body: VerifyOtpDto) {
    const otp = await this.prisma.otp.findMany({
      where: { otp_code: body.otp_code, user_id: body.user_id },
      select: {
        expired_at: true,
        user_id: true,
        otp_id: true,
        otp_code: true,
        used_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!otp.length) {
      throw new NotFoundException('OTP tidak ditemukan');
    }

    const date = new Date();
    const expired_at = new Date(otp[0].expired_at);

    if (date > expired_at) {
      throw new UnauthorizedException('OTP expired');
    }

    if (otp[0].used_at) {
      throw new UnauthorizedException('OTP telah digunakan');
    }

    await this.prisma.otp.updateMany({
      where: { otp_code: body.otp_code, user_id: body.user_id },
      data: {
        used_at: new Date(),
      },
    });

    return {
      token: await this.jwtService.signAsync(
        {
          otp_id: otp[0].otp_id,
          user_id: otp[0].user_id,
        },
        { expiresIn: '5m' },
      ),
    };
  }

  async resetPassword(body: ResetPasswordDto) {
    const payload: { otp_id: string; user_id: string } =
      await this.jwtService.verifyAsync(body.token, {
        secret: process.env.JWT_SECRET_KEY,
      });

    const [otp, user] = await this.prisma.$transaction([
      this.prisma.otp.count({ where: { otp_id: payload.otp_id } }),
      this.prisma.user.count({ where: { user_id: payload.user_id } }),
    ]);

    if (!otp || !user) {
      throw new NotFoundException('OTP atau User ID tidak ditemukan');
    }

    return this.prisma.user.update({
      where: {
        user_id: payload.user_id,
      },
      data: {
        password: await hashPassword(body.password),
      },
      select: {
        user_id: true,
      },
    });
  }

  async deleteStart(params: { test_id: string; user_id: string }) {
    if (
      !(await this.prisma.start.count({
        where: { test_id: params.test_id, user_id: params.user_id },
      }))
    ) {
      throw new NotFoundException('Test atau user tidak ditemukan');
    }

    await this.prisma.start.delete({
      where: {
        user_id_test_id: {
          test_id: params.test_id,
          user_id: params.user_id,
        },
      },
    });

    return params;
  }

  getMentors() {
    return this.prisma.mentor.findMany({
      where: {
        is_show: true,
      },
      select: {
        mentor_id: true,
        fullname: true,
        nickname: true,
        mentor_title: true,
        img_url: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
  }

  getMentor(mentor_id: string) {
    return this.prisma.mentor.findUnique({
      where: {
        mentor_id,
        is_show: true,
      },
      select: {
        mentor_id: true,
        fullname: true,
        nickname: true,
        mentor_title: true,
        description: true,
        img_url: true,
        created_at: true,
      },
    });
  }

  async getHomepageData() {
    return {
      mentors: await this.getMentors(),
    };
  }

  async getSubjectPrivate() {
    const [private_classes, mentors] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where: {
          subject_type: 'private',
          is_active: true,
        },
        select: {
          subject_id: true,
          title: true,
          description: true,
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
      }),
      this.prisma.classMentor.findMany({
        where: {
          type: 'private',
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
              description: true,
            },
          },
        },
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
      mentors: mentors.map((mentor) => {
        return {
          class_mentor_id: mentor.class_mentor_id,
          ...mentor.mentor,
        };
      }),
    };
  }

  async getTheses() {
    const [theses, mentors] = await this.prisma.$transaction([
      this.prisma.thesis.findMany({
        where: {
          is_active: true,
        },
        select: {
          thesis_id: true,
          title: true,
          description: true,
          price: true,
          link_order: true,
          thumbnail_url: true,
          thumbnail_type: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.classMentor.findMany({
        where: {
          type: 'thesis',
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
              description: true,
            },
          },
        },
      }),
    ]);

    return {
      theses,
      mentors: mentors.map((mentor) => {
        return {
          class_mentor_id: mentor.class_mentor_id,
          ...mentor.mentor,
        };
      }),
    };
  }

  async getResearch() {
    const [research, mentors] = await this.prisma.$transaction([
      this.prisma.research.findMany({
        where: {
          is_active: true,
        },
        select: {
          research_id: true,
          title: true,
          description: true,
          price: true,
          link_order: true,
          thumbnail_url: true,
          thumbnail_type: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.classMentor.findMany({
        where: {
          type: 'research',
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
              description: true,
            },
          },
        },
      }),
    ]);

    return {
      research,
      mentors: mentors.map((mentor) => {
        return {
          class_mentor_id: mentor.class_mentor_id,
          ...mentor.mentor,
        };
      }),
    };
  }

  async getUniversities(role: string) {
    const universities = await this.prisma.university.findMany({
      where: {
        ...(role === 'admin' || role === 'public' ? { is_active: true } : {}),
      },
      select: {
        univ_id: true,
        slug: true,
        title: true,
        thumbnail_url: true,
        ...(role === 'public'
          ? {}
          : { created_at: true, is_active: true, description: true }),
        _count: {
          select: { univdetail: true },
        },
      },
    });

    return universities.map((university) => {
      const { _count, ...rest } = university;

      return {
        ...rest,
        total_tests: _count.univdetail,
      };
    });
  }

  async getUniversity(id_or_slug: string) {
    return this.prisma.university
      .findFirst({
        where: {
          OR: [{ univ_id: id_or_slug }, { slug: id_or_slug }],
        },
        select: {
          univ_id: true,
          slug: true,
          title: true,
          description: true,
          thumbnail_url: true,
          created_at: true,
          is_active: true,
          univdetail: {
            select: {
              assessment: {
                select: {
                  ass_id: true,
                  title: true,
                  description: true,
                  _count: {
                    select: { question: true },
                  },
                },
              },
            },
          },
        },
      })
      .then((university) => {
        if (!university) return {};

        const { univdetail, ...rest } = university;

        return {
          ...rest,
          tests: univdetail.map((detail) => ({
            ass_id: detail.assessment.ass_id,
            title: detail.assessment.title,
            description: detail.assessment.description,
            total_questions: detail.assessment._count.question,
          })),
        };
      });
  }

  async createUniversity(body: CreateUniversityDto, file: Express.Multer.File) {
    const key = `universities/${Date.now()}-${file.originalname}`;

    const url = await this.storage.uploadFile({
      buffer: file.buffer,
      key,
      mimetype: file.mimetype,
    });

    const uid = new ShortUniqueId({ length: 10 });

    return this.prisma.university.create({
      data: {
        univ_id: `ROUNIV${uid.rnd().toUpperCase()}`,
        title: body.title,
        slug: slug(body.title),
        description: body.description,
        thumbnail_url: url,
        thumbnail_key: key,
        created_by: body.by,
        updated_by: body.by,
        univdetail: {
          createMany: {
            data: body.tests.map((test) => ({
              univd_id: `ROUNIVDET${uid.rnd().toUpperCase()}`,
              ass_id: test,
            })),
          },
        },
      },
      select: {
        univ_id: true,
      },
    });
  }

  async updateUniversity(body: UpdateUniversityDto, file: Express.Multer.File) {
    const university = await this.prisma.university.count({
      where: { univ_id: body.univ_id },
    });

    if (!university) {
      throw new NotFoundException('Universitas tidak ditemukan');
    }

    let key = '';
    let url = '';

    if (file) {
      key += `universities/${Date.now()}-${file.originalname}`;

      url += await this.storage.uploadFile({
        buffer: file.buffer,
        key,
        mimetype: file.mimetype,
      });
    }

    const uid = new ShortUniqueId({ length: 10 });

    await this.prisma.universityDetail.deleteMany({
      where: { univ_id: body.univ_id },
    });

    return this.prisma.university.update({
      where: { univ_id: body.univ_id },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        description: body.description,
        is_active: parseIsActive(body.is_active),
        thumbnail_url: url ? url : undefined,
        thumbnail_key: key ? key : undefined,
        updated_by: body.by,
        univdetail: {
          createMany: {
            data: body.tests.map((test) => ({
              univd_id: `ROUNIVDET${uid.rnd().toUpperCase()}`,
              ass_id: test,
            })),
          },
        },
      },
      select: { univ_id: true },
    });
  }

  async deleteUniversityDetail(univd_id: string) {
    const count = await this.prisma.universityDetail.count({
      where: { univd_id },
    });

    if (!count) {
      throw new NotFoundException('Ujian tidak ditemukan');
    }

    return this.prisma.universityDetail.delete({
      where: { univd_id },
      select: { univd_id: true },
    });
  }

  async getApotekerClass(req: Request) {
    const subscriptions_promise = req.is_login
      ? Promise.resolve([])
      : this.prisma.subscriptionPackage.findMany({
          where: {
            is_active: true,
            type: 'apotekerclass',
          },
          select: {
            package_id: true,
            name: true,
            price: true,
            duration: true,
            type: true,
            link_order: true,
            benefit: {
              select: {
                benefit_id: true,
                description: true,
              },
            },
          },
          orderBy: {
            price: 'asc',
          },
        });

    const [categories, subscriptions, universities] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          is_active: true,
          type: 'apotekerclass',
        },
        select: {
          category_id: true,
          name: true,
          slug: true,
          img_url: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      subscriptions_promise,
      this.getUniversities('public'),
    ]);

    return {
      categories,
      universities,
      subscriptions: subscriptions.length
        ? subscriptions.map((subscription) => {
            const { benefit: benefits, ...rest } = subscription;

            return {
              ...rest,
              benefits,
            };
          })
        : [],
      is_login: req.is_login,
    };
  }

  async getVideoCourse(req: Request) {
    const subscriptions_promise = req.is_login
      ? Promise.resolve([])
      : this.prisma.subscriptionPackage.findMany({
          where: {
            is_active: true,
            type: 'videocourse',
          },
          select: {
            package_id: true,
            name: true,
            price: true,
            duration: true,
            type: true,
            link_order: true,
            benefit: {
              select: {
                benefit_id: true,
                description: true,
              },
            },
          },
          orderBy: {
            price: 'asc',
          },
        });

    const [categories, subscriptions] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          is_active: true,
          type: 'videocourse',
        },
        select: {
          category_id: true,
          name: true,
          slug: true,
          img_url: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      subscriptions_promise,
    ]);

    return {
      categories,
      subscriptions: subscriptions.length
        ? subscriptions.map((subscription) => {
            const { benefit: benefits, ...rest } = subscription;

            return {
              ...rest,
              benefits,
            };
          })
        : [],
      is_login: req.is_login,
    };
  }

  async getContents(
    cat_or_sub: string,
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    req: Request,
  ) {
    if (!['videocourse', 'apotekerclass', 'videoukmppai'].includes(type)) {
      return [];
    }

    const OR: {
      category_id?: string;
      sub_category_id?: string;
      slug?: string;
    }[] = [];

    let model: 'category' | 'subCategory' | '' = '';
    let field: 'category' | 'sub_category' | '' = '';

    if (type === 'apotekerclass') {
      model += 'category';
      field += 'category';
      OR.push({ category_id: cat_or_sub }, { slug: cat_or_sub });
    } else {
      model += 'subCategory';
      field += 'sub_category';
      OR.push({ sub_category_id: cat_or_sub }, { slug: cat_or_sub });
    }

    const histories: {
      assessment: {
        ass_id: string;
        title: string;
      };
      created_at: Date;
      assr_id: string;
      score: number;
    }[] = [];

    const subscriptions: {
      name: string;
      type: $Enums.SubscriptionType;
      package_id: string;
      price: number;
      duration: number;
      link_order: string;
      benefit: {
        description: string;
        benefit_id: string;
      }[];
    }[] = [];

    if (req.is_login) {
      const result = await this.prisma.assessmentResult.findMany({
        where: {
          user_id: req.user.user_id,
          assessment: {
            ass_type: type,
            variant: 'quiz',
            is_active: true,
          },
        },
        select: {
          assr_id: true,
          score: true,
          created_at: true,
          assessment: {
            select: {
              ass_id: true,
              title: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      histories.push(...result);
    } else {
      const results = await this.prisma.subscriptionPackage.findMany({
        where: {
          is_active: true,
          type,
        },
        select: {
          package_id: true,
          name: true,
          price: true,
          duration: true,
          type: true,
          link_order: true,
          benefit: {
            select: {
              benefit_id: true,
              description: true,
            },
          },
        },
        orderBy: {
          price: 'asc',
        },
      });

      subscriptions.push(...results);
    }

    const [category, quizzes, cards] = await this.prisma.$transaction([
      this.prisma[model].findFirst({
        where: {
          OR,
          type,
          is_active: true,
        },
        select: {
          name: true,
          slug: true,
          img_url: true,
          type: true,
          course: {
            where: {
              is_active: true,
            },
            select: {
              course_id: true,
              title: true,
              slug: true,
              thumbnail_url: true,
              created_at: true,
              segment: {
                select: {
                  content: {
                    select: {
                      content_type: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.assessment.findMany({
        where: {
          ass_type: type,
          variant: 'quiz',
          [field]: {
            OR: [{ [field + '_id']: cat_or_sub }, { slug: cat_or_sub }],
          },
          is_active: true,
          ass_id: {
            notIn: histories.map((item) => item.assessment.ass_id),
          },
        },
        select: {
          ass_id: true,
          description: true,
          title: true,
          _count: {
            select: {
              question: true,
            },
          },
        },
      }),
      this.prisma.card.findMany({
        where: {
          [field]: {
            OR: [{ [field + '_id']: cat_or_sub }, { slug: cat_or_sub }],
          },
          is_active: true,
        },
        select: {
          card_id: true,
          text: true,
          url: true,
          type: true,
        },
      }),
    ]);

    if (!category) return {};

    const { course, ...rest } = category;

    return {
      ...rest,
      courses: course.length
        ? course.map((item) => {
            const { segment, ...course_data } = item;

            const segments = segment.flatMap((seg) => seg.content);

            const total_videos = segments.filter(
              (cont) => cont.content_type === 'video',
            ).length;
            const total_tests = segments.filter(
              (cont) => cont.content_type === 'test',
            ).length;

            return {
              ...course_data,
              total_videos,
              total_tests,
            };
          })
        : [],
      quizzes: quizzes.length
        ? quizzes.map((quiz) => {
            const { _count, ...rest } = quiz;

            return {
              ...rest,
              total_questions: _count.question,
            };
          })
        : [],
      histories: histories.length
        ? histories.map((history) => {
            return {
              assr_id: history.assr_id,
              score: history.score,
              created_at: history.created_at,
              ...history.assessment,
            };
          })
        : [],
      cards,
      subscriptions: subscriptions.length
        ? subscriptions.map((subscription) => {
            const { benefit: benefits, ...rest } = subscription;

            return {
              ...rest,
              benefits,
            };
          })
        : [],
      is_login: req.is_login,
    };
  }

  async startAssessment({
    ass_or_content_id,
    questions,
  }: {
    ass_or_content_id: string;
    questions: StartAssessmentQuestion[];
  }) {
    const [assessment_count, content_count] = await this.prisma.$transaction([
      this.prisma.assessment.count({ where: { ass_id: ass_or_content_id } }),
      this.prisma.content.count({ where: { content_id: ass_or_content_id } }),
    ]);

    if (!assessment_count && !content_count) {
      throw new NotFoundException('Test/kuiz atau konten tidak ditemukan');
    }

    const shuffles = shuffle(questions).map((question, index) => {
      return {
        number: index + 1,
        ...question,
        user_answer: '',
        is_hesitant: false,
      };
    });

    return {
      questions: shuffles,
      total_questions: questions.length,
    };
  }

  async getAssessmentQuestions(ass_or_content_id: string) {
    const [assessment_count, content_count] = await this.prisma.$transaction([
      this.prisma.assessment.count({ where: { ass_id: ass_or_content_id } }),
      this.prisma.content.count({ where: { content_id: ass_or_content_id } }),
    ]);

    if (!assessment_count && !content_count) {
      throw new NotFoundException('Test/kuiz atau konten tidak ditemukan');
    }

    return this.prisma.assessmentQuestion
      .findMany({
        where: {
          OR: [
            {
              ass_id: ass_or_content_id,
            },
            {
              content_id: ass_or_content_id,
            },
          ],
        },
        select: {
          assq_id: true,
          text: true,
          url: true,
          type: true,
          option: {
            select: {
              asso_id: true,
              text: true,
            },
          },
        },
      })
      .then((questions) => {
        return questions.map((question) => {
          const { option, ...rest } = question;
          return {
            ...rest,
            options: option,
          };
        });
      });
  }

  async finishAssessment(
    ass_id: string,
    body: FinishAssessmentDto,
    user_id: string,
  ) {
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        ass_id,
      },
      select: {
        ass_id: true,
        question: {
          select: {
            assq_id: true,
            option: {
              select: {
                asso_id: true,
                is_correct: true,
              },
              where: {
                is_correct: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Test atau Kuiz tidak ditemukan');
    }

    const questions = assessment.question;
    const total_questions = assessment.question.length;
    const point = 100 / total_questions;
    let total_correct = 0;
    let total_incorrect = 0;
    const uid = new ShortUniqueId({ length: 12 });

    const user_questions: {
      number: number;
      assq_id: string;
      correct_option: string;
      user_answer: string;
      is_correct: boolean;
    }[] = [];

    for (const user_question of body.questions) {
      const assessment_question = questions.find(
        (question) => question.assq_id === user_question.assq_id,
      );

      const correct_options = assessment_question.option.map(
        (item) => item.asso_id,
      );

      if (user_question.user_answer) {
        if (correct_options.includes(user_question.user_answer)) {
          user_questions.push({
            number: user_question.number,
            assq_id: user_question.assq_id,
            correct_option: correct_options[0],
            user_answer: user_question.user_answer,
            is_correct: true,
          });

          total_correct += 1;
        } else {
          user_questions.push({
            number: user_question.number,
            assq_id: user_question.assq_id,
            correct_option: correct_options[0],
            user_answer: user_question.user_answer,
            is_correct: false,
          });

          total_incorrect += 1;
        }
      } else {
        user_questions.push({
          number: user_question.number,
          assq_id: user_question.assq_id,
          correct_option: correct_options[0],
          user_answer: user_question.user_answer,
          is_correct: false,
        });

        total_incorrect += 1;
      }
    }

    return this.prisma.assessmentResult.create({
      data: {
        assr_id: `ROAR${uid.rnd().toUpperCase()}`,
        ass_id,
        user_id,
        total_correct,
        total_incorrect,
        score: Math.round(total_correct * point),
        resultdetail: {
          createMany: {
            data: user_questions.map((item) => {
              return {
                assq_id: item.assq_id,
                assrd_id: `ROARD${uid.rnd().toUpperCase()}`,
                number: item.number,
                correct_option: item.correct_option ? item.correct_option : '',
                user_answer: item.user_answer,
                is_correct: item.is_correct,
              };
            }),
          },
        },
      },
      select: {
        assr_id: true,
      },
    });
  }

  async getCategory(
    id_or_slug: string,
    role: string,
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
  ) {
    if (!['videocourse', 'apotekerclass', 'videoukmppai'].includes(type)) {
      return {};
    }

    const category = await this.prisma.category.findFirst({
      where: {
        OR: [
          {
            category_id: id_or_slug,
          },
          {
            slug: id_or_slug,
          },
        ],
        ...(role === 'admin' ? { is_active: true } : {}),
        type,
      },
      select: {
        category_id: true,
        name: true,
        slug: true,
        img_url: true,
        type: true,
        subcategory: {
          where: { ...(role === 'admin' ? { is_active: true } : {}) },
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
          },
        },
      },
    });

    if (!category) return {};

    const { subcategory, ...all } = category;

    return {
      ...all,
      sub_categories: subcategory,
    };
  }
}
