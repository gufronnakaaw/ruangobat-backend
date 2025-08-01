import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
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
  AppQuery,
  CreateFeedbackDto,
  CreateGeneralTestimonialDto,
  CreateProgressDto,
  CreateTryoutDto,
  CreateUniversityDto,
  FinishAssessmentDto,
  ResetPasswordDto,
  StartAssessmentQuestion,
  UpdateTryoutDto,
  UpdateUniversityDto,
  VerifyOtpDto,
} from './app.dto';
import { removeKeys, shuffle } from './utils/array.util';
import { hashPassword } from './utils/bcrypt.util';
import { decryptString, generateToken, verifyToken } from './utils/crypto.util';
import { PrismaService } from './utils/services/prisma.service';
import { StorageService } from './utils/services/storage.service';
import {
  parseIsActive,
  parseSortQuery,
  scoreCategory,
  slug,
} from './utils/string.util';

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

    const template = `<p>Dear ${user.fullname},</p><p>Please use the one-time password below to authorize your account. It is valid for 5 minutes.</p><p><strong>${otp_code}</strong></p>---<p>RuangObat<br><a href="https://ruangobat.id" target="_blank">https://ruangobat.id</a></p>`;

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
        from: `RuangObat <${process.env.EMAIL_ALIAS_ONE}>`,
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

    const template = `<p>Please use the one-time password below to authorize your account. It is valid for 5 minutes.</p><p><strong>${otp_code}</strong></p>---<p>RuangObat<br><a href="https://ruangobat.id" target="_blank">https://ruangobat.id</a></p>`;

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
        from: `RuangObat <${process.env.EMAIL_ALIAS_ONE}>`,
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
          created_at: 'asc',
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
          created_at: 'asc',
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

  async getUniversities(query: AppQuery) {
    const where: any = {};

    if (query.filter === 'inactive') {
      where.is_active = false;
    } else {
      where.is_active = true;
    }

    const universities = await this.prisma.university.findMany({
      where,
      select: {
        univ_id: true,
        slug: true,
        title: true,
        thumbnail_url: true,
        created_at: true,
        is_active: true,
        description: true,
        _count: {
          select: { univdetail: true },
        },
      },
      orderBy: query.sort
        ? parseSortQuery(query.sort, ['created_at', 'title'])
        : { created_at: 'desc' },
    });

    return universities.map((university) => {
      const { _count, ...rest } = university;

      return {
        ...rest,
        total_tests: _count.univdetail,
      };
    });
  }

  getUniversity(id_or_slug: string) {
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
    const [data_subscriptions, categories, universities] =
      await this.prisma.$transaction([
        this.prisma.subscriptionPackage.findMany({
          where: {
            is_active: true,
            type: 'apotekerclass',
          },
          select: {
            package_id: true,
            name: true,
            price: true,
            discount_amount: true,
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
        }),
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
        this.prisma.university.findMany({
          where: {
            is_active: true,
          },
          select: {
            univ_id: true,
            slug: true,
            title: true,
            thumbnail_url: true,
            _count: {
              select: { univdetail: true },
            },
          },
        }),
      ]);

    let show_subscriptions = true;

    if (req.is_login) {
      const access = await this.prisma.access.count({
        where: {
          user_id: req.user.user_id,
          is_active: true,
          type: 'apotekerclass',
        },
      });

      show_subscriptions = !access;
    }

    return {
      categories,
      universities: universities.map((university) => {
        const { _count, ...rest } = university;

        return {
          ...rest,
          total_tests: _count?.univdetail ?? 0,
        };
      }),
      subscriptions: show_subscriptions
        ? data_subscriptions.map((subscription) => {
            const { benefit: benefits, ...rest } = subscription;

            return {
              ...rest,
              benefits,
            };
          })
        : [],
      is_login: req.is_login,
      has_subscription: !show_subscriptions,
    };
  }

  async getVideoCourse(req: Request) {
    const [data_subscriptions, categories] = await this.prisma.$transaction([
      this.prisma.subscriptionPackage.findMany({
        where: {
          is_active: true,
          type: 'videocourse',
        },
        select: {
          package_id: true,
          name: true,
          price: true,
          discount_amount: true,
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
      }),
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
    ]);

    let show_subscriptions = true;

    if (req.is_login) {
      const access = await this.prisma.access.count({
        where: {
          user_id: req.user.user_id,
          is_active: true,
          type: 'videocourse',
        },
      });

      show_subscriptions = !access;
    }

    return {
      categories,
      subscriptions: show_subscriptions
        ? data_subscriptions.map((subscription) => {
            const { benefit: benefits, ...rest } = subscription;

            return {
              ...rest,
              benefits,
            };
          })
        : [],
      is_login: req.is_login,
      has_subscription: !show_subscriptions,
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

    const data_subscriptions = await this.prisma.subscriptionPackage.findMany({
      where: {
        is_active: true,
        type,
      },
      select: {
        package_id: true,
        name: true,
        price: true,
        discount_amount: true,
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

    if (req.is_login) {
      const [access, assessment_histories] = await this.prisma.$transaction([
        this.prisma.access.count({
          where: {
            user_id: req.user.user_id,
            is_active: true,
            type,
          },
        }),
        this.prisma.assessmentResult.findMany({
          where: {
            user_id: req.user.user_id,
            variant: 'quiz',
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
        }),
      ]);

      if (!access) {
        subscriptions.push(...data_subscriptions);
      }

      histories.push(...assessment_histories);
    } else {
      subscriptions.push(...data_subscriptions);
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
      has_subscription: !subscriptions.length,
    };
  }

  async startAssessment({
    ass_or_content_id,
    questions,
  }: {
    ass_or_content_id: string;
    questions: StartAssessmentQuestion[];
  }) {
    const [assessment, content] = await this.prisma.$transaction([
      this.prisma.assessment.findUnique({
        where: { ass_id: ass_or_content_id },
        select: { title: true },
      }),
      this.prisma.content.findUnique({
        where: { content_id: ass_or_content_id },
        select: { title: true },
      }),
    ]);

    if (!assessment && !content) {
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
      title: assessment ? assessment.title : content.title,
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

  async finishAssessment(body: FinishAssessmentDto, user_id: string) {
    const [assessment, content] = await this.prisma.$transaction([
      this.prisma.assessment.findFirst({
        where: {
          ass_id: body.value_id,
        },
        select: { variant: true },
      }),
      this.prisma.content.findFirst({
        where: {
          content_id: body.value_id,
        },
        select: { test_type: true },
      }),
    ]);

    if (!assessment && !content) {
      throw new NotFoundException('Test/kuiz atau konten tidak ditemukan');
    }

    const questions = await this.prisma.assessmentQuestion.findMany({
      where: {
        OR: [
          {
            ass_id: body.value_id,
          },
          {
            content_id: body.value_id,
          },
        ],
      },
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
    });

    const total_questions = questions.length;
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

    const result = await this.prisma.assessmentResult.create({
      data: {
        assr_id: `ROAR${uid.rnd().toUpperCase()}`,
        ...(body.field_id === 'ass_id' ? { ass_id: body.value_id } : {}),
        ...(body.field_id === 'content_id'
          ? { content_id: body.value_id }
          : {}),
        user_id,
        total_correct,
        total_incorrect,
        score: Math.round(total_correct * point),
        variant: assessment ? assessment.variant : content.test_type,
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

    if (body.field_id === 'content_id') {
      await this.prisma.userContentProgress.create({
        data: {
          user_id,
          content_id: body.value_id,
          progress_type: 'test',
        },
      });
    }

    return result;
  }

  async getAssessmentResult({
    assr_id,
    user_id,
  }: {
    assr_id: string;
    user_id: string;
  }) {
    const result = await this.prisma.assessmentResult.findUnique({
      where: {
        assr_id,
        user_id,
      },
      select: {
        assr_id: true,
        score: true,
        total_correct: true,
        total_incorrect: true,
        resultdetail: {
          select: {
            number: true,
            correct_option: true,
            user_answer: true,
            is_correct: true,
            question: {
              select: {
                assq_id: true,
                text: true,
                explanation: true,
                type: true,
                url: true,
                option: {
                  select: {
                    asso_id: true,
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
      assr_id: result.assr_id,
      score: result.score,
      score_category: scoreCategory(result.score),
      total_correct: result.total_correct,
      total_incorrect: result.total_incorrect,
      questions: result.resultdetail.map((detail) => {
        return {
          number: detail.number,
          assq_id: detail.question.assq_id,
          text: detail.question.text,
          explanation: detail.question.explanation,
          type: detail.question.type,
          url: detail.question.url,
          options: detail.question.option,
          correct_option: detail.correct_option,
          user_answer: detail.user_answer,
          is_correct: detail.is_correct,
        };
      }),
    };
  }

  async getCategory(
    id_or_slug: string,
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
        is_active: true,
        type,
      },
      select: {
        category_id: true,
        name: true,
        slug: true,
        img_url: true,
        type: true,
        subcategory: {
          where: { is_active: true },
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
          },
          orderBy: {
            name: 'asc',
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

  async getContent(
    slug: string,
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    req: Request,
  ) {
    if (!['videocourse', 'apotekerclass', 'videoukmppai'].includes(type)) {
      return {};
    }

    const [course, total_progress, segments] = await this.prisma.$transaction([
      this.prisma.course.findFirst({
        where: {
          slug,
          type,
          is_active: true,
        },
        select: {
          course_id: true,
          title: true,
          slug: true,
          thumbnail_url: true,
          preview_url: true,
          description: true,
        },
      }),
      this.prisma.userContentProgress.count({
        where: {
          user_id: req.is_login ? req.user.user_id : '',
          content: {
            segment: {
              course: {
                slug,
                type,
                is_active: true,
              },
            },
          },
        },
      }),
      this.prisma.segment.findMany({
        where: {
          course: {
            slug,
            type,
            is_active: true,
          },
          is_active: true,
        },
        select: {
          segment_id: true,
          title: true,
          number: true,
          _count: {
            select: {
              content: true,
            },
          },
        },
        orderBy: {
          number: 'asc',
        },
      }),
    ]);

    const total_contents = segments.reduce(
      (acc, segment) => acc + segment._count.content,
      0,
    );

    return {
      ...course,
      segments: segments.length
        ? segments.map((segment) => {
            return {
              segment_id: segment.segment_id,
              number: segment.number,
              title: segment.title,
            };
          })
        : [],
      progress: {
        total_contents,
        total_progress,
        percentage: Math.floor((total_progress / total_contents) * 100),
      },
      is_login: req.is_login,
    };
  }

  async getSegmentContents(
    course_id: string,
    segment_id: string,
    req: Request,
  ) {
    const [course, contents] = await this.prisma.$transaction([
      this.prisma.course.findUnique({
        where: {
          course_id,
        },
        select: {
          type: true,
        },
      }),
      this.prisma.content.findMany({
        where: {
          segment_id,
          is_active: true,
        },
        select: {
          content_id: true,
          content_type: true,
          title: true,
          test_type: true,
          duration: true,
          video_note: true,
          video_note_url: true,
          result: {
            where: {
              user_id: req.is_login ? req.user.user_id : '',
            },
            select: {
              assr_id: true,
              score: true,
            },
            orderBy: {
              created_at: 'desc',
            },
          },
          _count: {
            select: {
              question: true,
              progress: {
                where: {
                  user_id: req.is_login ? req.user.user_id : '',
                },
              },
            },
          },
          segment: {
            select: {
              number: true,
            },
          },
          number: true,
        },
        orderBy: {
          number: 'asc',
        },
      }),
    ]);

    let has_subscription: boolean = false;

    if (req.is_login) {
      const access = await this.prisma.access.count({
        where: {
          user_id: req.user.user_id,
          is_active: true,
          type: course.type,
        },
      });

      has_subscription = Boolean(access);
    }

    // const lowest = Math.min(
    //   ...contents
    //     .filter((content) => content.content_type === 'video')
    //     .map((content) => content.number),
    // );

    const contents_mapping = contents.map((content) => {
      const { _count, ...rest } = content;

      let is_locked: boolean;
      let has_note: boolean;
      let token: string | null = null;

      if (!req.is_login) {
        is_locked = true;
      } else {
        if (has_subscription) {
          is_locked = false;
          token = generateToken(3600);
        } else {
          is_locked = true;
          // if (
          //   segment.number === 1 &&
          //   ((rest.content_type === 'test' && rest.test_type === 'pre') ||
          //     (rest.content_type === 'video' && rest.number === lowest))
          // ) {
          //   is_locked = false;
          //   token = generateToken(3600);
          // } else {
          //   is_locked = true;
          // }
        }
      }

      if (rest.video_note || rest.video_note_url) {
        has_note = true;
      } else {
        has_note = false;
      }

      delete rest.number;

      if (content.content_type === 'test') {
        const { result, ...mapping } = removeKeys(rest, [
          'video_note',
          'video_note_url',
          'duration',
        ]);

        return {
          ...mapping,
          is_locked,
          is_completed: Boolean(result.length),
          result_id: result.length ? result[0].assr_id : null,
          score: result.length ? result[0].score : 0,
          total_questions: _count.question,
        };
      }

      const mapping = removeKeys(rest, ['test_type', 'result']);

      return {
        ...mapping,
        is_locked,
        is_completed: Boolean(_count.progress),
        has_note,
        token,
      };
    });

    const pre = contents_mapping.find(
      (item) =>
        item.content_type === 'test' &&
        'test_type' in item &&
        item.test_type === 'pre',
    );

    const videos = contents_mapping.filter(
      (item) => item.content_type === 'video',
    );

    const post = contents_mapping.find(
      (item) =>
        item.content_type === 'test' &&
        'test_type' in item &&
        item.test_type === 'post',
    );

    return [...(pre ? [pre] : []), ...videos, ...(post ? [post] : [])];
  }

  async createProgress(body: CreateProgressDto, user_id: string) {
    const content = await this.prisma.content.findUnique({
      where: {
        content_id: body.content_id,
      },
      select: {
        content_type: true,
        segment: {
          select: {
            course: {
              select: {
                slug: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    if (
      await this.prisma.userContentProgress.count({
        where: { user_id, content_id: body.content_id },
      })
    ) {
      throw new BadRequestException('Konten sudah ditandai sebagai selesai');
    }

    await this.prisma.userContentProgress.create({
      data: {
        user_id,
        content_id: body.content_id,
        progress_type: content.content_type,
      },
    });

    const [total_progress, segments] = await this.prisma.$transaction([
      this.prisma.userContentProgress.count({
        where: {
          user_id,
          content: {
            segment: {
              course: {
                slug: content.segment.course.slug,
                type: content.segment.course.type,
              },
            },
          },
        },
      }),
      this.prisma.segment.findMany({
        where: {
          course: {
            slug: content.segment.course.slug,
            type: content.segment.course.type,
          },
        },
        select: {
          _count: {
            select: {
              content: true,
            },
          },
        },
      }),
    ]);

    const total_contents = segments.reduce(
      (acc, segment) => acc + segment._count.content,
      0,
    );

    return {
      total_contents,
      total_progress,
      percentage: Math.floor((total_progress / total_contents) * 100),
    };
  }

  async getVideoUrl(content_id: string, token: string) {
    if (!token || !verifyToken(token)) {
      throw new ForbiddenException('Akses ditolak');
    }

    const content = await this.prisma.content.findUnique({
      where: { content_id },
      select: { video_url: true },
    });

    if (!content) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    const url = new URL(content.video_url);

    return {
      video_url: await this.storage.getSingleSignedUrl(
        decodeURIComponent(url.pathname.slice(1)),
        120,
      ),
    };
  }

  async getContentNotes(content_id: string, token: string) {
    if (!token || !verifyToken(token)) {
      throw new ForbiddenException('Akses ditolak');
    }

    const content = await this.prisma.content.findUnique({
      where: { content_id },
      select: {
        video_note_url: true,
        video_note: true,
      },
    });

    if (!content) {
      throw new NotFoundException('Konten tidak ditemukan');
    }

    return content;
  }

  async getUniversityDetail(id_or_slug: string, req: Request) {
    const histories: {
      ass_id: string;
      title: string;
      created_at: Date;
      assr_id: string;
      score: number;
    }[] = [];

    let has_subscription = false;
    const access_tests: { univ_id: string }[] = [];

    if (req.is_login) {
      const [access, results, access_tests_result] =
        await this.prisma.$transaction([
          this.prisma.access.count({
            where: {
              user_id: req.user.user_id,
              is_active: true,
              type: 'apotekerclass',
            },
          }),
          this.prisma.assessmentResult.findMany({
            where: {
              user_id: req.user.user_id,
              variant: 'tryout',
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
          }),
          this.prisma.accessTest.findMany({
            where: {
              user_id: req.user.user_id,
            },
            select: {
              univ_id: true,
            },
          }),
        ]);

      if (access) {
        has_subscription = true;
        access_tests.push(...access_tests_result);
      }

      histories.push(
        ...results.map((item) => ({
          ass_id: item.assessment.ass_id,
          title: item.assessment.title,
          created_at: item.created_at,
          assr_id: item.assr_id,
          score: item.score,
        })),
      );
    }

    const university = await this.prisma.university.findFirst({
      where: {
        OR: [{ univ_id: id_or_slug }, { slug: id_or_slug }],
        is_active: true,
      },
      select: {
        univ_id: true,
        slug: true,
        title: true,
        description: true,
        thumbnail_url: true,
        created_at: true,
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
    });

    if (!university) return {};

    const { univdetail, ...rest } = university;

    const histories_mapping = new Set(histories.map((item) => item.ass_id));

    const tryouts_mapping = univdetail.filter(
      (detail) => !histories_mapping.has(detail.assessment.ass_id),
    );

    return {
      ...rest,
      tryouts: tryouts_mapping.map((detail) => {
        return {
          ass_id: detail.assessment.ass_id,
          title: detail.assessment.title,
          description: detail.assessment.description,
          total_questions: detail.assessment._count.question,
          has_access: access_tests.some(
            (test) => test.univ_id === university.univ_id,
          ),
        };
      }),
      histories: histories.length ? histories : [],
      is_login: req.is_login,
      has_subscription,
    };
  }

  async getTestimonials(query: AppQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }

    const [total_testimonials, testimonials] = await this.prisma.$transaction([
      this.prisma.testimonial.count({
        where,
      }),
      this.prisma.testimonial.findMany({
        where,
        select: {
          testimonial_id: true,
          user: {
            select: {
              fullname: true,
              university: true,
            },
          },
          type: true,
          content: true,
          img_url: true,
          created_at: true,
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at'])
          : { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    return {
      testimonials: testimonials.map((testimonial) => {
        if (testimonial.type === 'general') {
          return {
            testimonial_id: testimonial.testimonial_id,
            fullname: testimonial.user.fullname,
            university: testimonial.user.university,
            type: testimonial.type,
            content: testimonial.content,
            created_at: testimonial.created_at,
          };
        }
        return {
          testimonial_id: testimonial.testimonial_id,
          img_url: testimonial.img_url,
          type: testimonial.type,
          created_at: testimonial.created_at,
        };
      }),
      page,
      total_testimonials,
      total_pages: Math.ceil(total_testimonials / take),
    };
  }

  createGeneralTestimonial(body: CreateGeneralTestimonialDto, user_id: string) {
    return this.prisma.testimonial.create({
      data: {
        user_id,
        type: 'general',
        content: body.content,
      },
      select: {
        testimonial_id: true,
      },
    });
  }

  async getTryouts(query: AppQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {
      ass_type: 'apotekerclass',
      variant: 'tryout',
    };

    if (query.filter === 'inactive') {
      where.is_active = false;
    } else {
      where.is_active = true;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { ass_id: { contains: query.q } },
      ];
    }

    const [total_tryouts, tryouts] = await this.prisma.$transaction([
      this.prisma.assessment.count({
        where,
      }),
      this.prisma.assessment.findMany({
        where,
        select: {
          ass_id: true,
          title: true,
          description: true,
          variant: true,
          ass_type: true,
          _count: {
            select: {
              question: true,
            },
          },
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    if (!tryouts) return {};

    return {
      tryouts: tryouts.map(({ _count, ...rest }) => ({
        ...rest,
        total_questions: _count.question,
      })),
      page,
      total_tryouts,
      total_pages: Math.ceil(total_tryouts / take),
    };
  }

  async getTryout(ass_id: string, query: AppQuery) {
    const default_page = 1;
    const take = 20;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const [total_questions, tryouts] = await this.prisma.$transaction([
      this.prisma.assessmentQuestion.count({ where: { ass_id } }),
      this.prisma.assessment.findUnique({
        where: { ass_id },
        select: {
          ass_id: true,
          title: true,
          description: true,
          ass_type: true,
          variant: true,
          question: {
            select: {
              assq_id: true,
              number: true,
              text: true,
              explanation: true,
              type: true,
              option: {
                select: {
                  asso_id: true,
                  text: true,
                  is_correct: true,
                },
              },
              _count: {
                select: {
                  resultdetail: true,
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

    const { question, ...rest } = tryouts;

    return {
      ...rest,
      questions: question.map((item) => {
        const { _count, option, ...question_data } = item;

        return {
          ...question_data,
          options: option,
          can_delete: Boolean(!_count.resultdetail),
        };
      }),
      page,
      total_questions,
      total_pages: Math.ceil(total_questions / take),
    };
  }

  async createTryout(body: CreateTryoutDto) {
    const ass_id = `ROASS${random(10000000, 99999999)}`;
    const uid = new ShortUniqueId({ length: 12 });

    const promises = [];

    for (const [index, question] of body.questions.entries()) {
      promises.push(
        this.prisma.assessmentQuestion.create({
          data: {
            ass_id,
            assq_id: `ROQ${uid.rnd().toUpperCase()}`,
            text: question.text,
            explanation: question.explanation,
            url: question.url,
            type: question.type,
            number: question.number ? question.number : index + 1,
            created_by: body.by,
            updated_by: body.by,
            option: {
              createMany: {
                data: question.options.map((option) => ({
                  asso_id: `ROO${uid.rnd().toUpperCase()}`,
                  text: option.text,
                  is_correct: option.is_correct,
                  created_by: body.by,
                  updated_by: body.by,
                })),
              },
            },
          },
        }),
      );
    }

    await this.prisma.assessment.create({
      data: {
        ass_id,
        title: body.title,
        description: body.description,
        ass_type: 'apotekerclass',
        created_by: body.by,
        updated_by: body.by,
        variant: 'tryout',
      },
    });

    await Promise.all(promises);

    return {
      ass_id,
    };
  }

  async updateTryout(body: UpdateTryoutDto) {
    const tryout = await this.prisma.assessment.count({
      where: { ass_id: body.ass_id },
    });

    if (!tryout) {
      throw new NotFoundException('Tryout tidak ditemukan');
    }

    if (body.update_type === 'update_tryout') {
      return this.prisma.assessment.update({
        where: {
          ass_id: body.ass_id,
        },
        data: {
          title: body.title,
          description: body.description,
          updated_by: body.by,
          is_active: parseIsActive(body.is_active),
        },
        select: {
          ass_id: true,
        },
      });
    }

    if (body.update_type == 'update_question') {
      const promises = [];

      promises.push(
        this.prisma.assessmentQuestion.update({
          where: {
            assq_id: body.questions[0].assq_id,
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
          this.prisma.assessmentOption.updateMany({
            where: {
              assq_id: body.questions[0].assq_id,
              asso_id: option.asso_id,
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
      const uid = new ShortUniqueId({ length: 12 });
      const count = await this.prisma.assessmentQuestion.count({
        where: { ass_id: body.ass_id },
      });

      const question = body.questions[0];

      return this.prisma.assessmentQuestion.create({
        data: {
          assq_id: `ROQ${uid.rnd().toUpperCase()}`,
          ass_id: body.ass_id,
          type: question.type,
          url: question.url,
          explanation: question.explanation,
          number: count + 1,
          text: question.text,
          created_by: body.by,
          updated_by: body.by,
          option: {
            createMany: {
              data: question.options.map((option) => {
                return {
                  asso_id: `ROO${uid.rnd().toUpperCase()}`,
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

  async deleteTryoutQuestion(params: { ass_id: string; assq_id: string }) {
    const tryout = await this.prisma.assessmentQuestion.count({
      where: { ass_id: params.ass_id, assq_id: params.assq_id },
    });

    if (!tryout) {
      throw new NotFoundException('Tryout atau question tidak ditemukan');
    }

    const [, questions] = await this.prisma.$transaction([
      this.prisma.assessmentQuestion.delete({
        where: { ass_id: params.ass_id, assq_id: params.assq_id },
      }),
      this.prisma.assessmentQuestion.findMany({
        where: { ass_id: params.ass_id },
        select: {
          assq_id: true,
        },
      }),
    ]);

    const promises = [];

    for (const [index, question] of questions.entries()) {
      promises.push(
        this.prisma.assessmentQuestion.update({
          where: {
            ass_id: params.ass_id,
            assq_id: question.assq_id,
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
}
