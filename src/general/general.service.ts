import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { random } from 'lodash';
import ShortUniqueId from 'short-unique-id';
import { hashPassword } from '../utils/bcrypt.util';
import { decryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import {
  CreateFeedbackDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './general.dto';

@Injectable()
export class GeneralService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
    private jwtService: JwtService,
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
        from: `IT Ruang Obat <${process.env.EMAIL_USERNAME}>`,
        to: user.email,
        subject: 'OTP',
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
        from: `IT Ruang Obat <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject: 'OTP',
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

  async getSubjectPreparation() {
    const [preparation_classes, mentors] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where: {
          subject_type: 'preparation',
          is_active: true,
        },
        select: {
          subject_id: true,
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
          type: 'preparation',
        },
        select: {
          class_mentor_id: true,
          mentor: {
            select: {
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
      preparation_classes,
      mentors: mentors.map((mentor) => {
        return {
          class_mentor_id: mentor.class_mentor_id,
          ...mentor.mentor,
        };
      }),
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

  getUniversity() {
    return this.prisma.university.findMany({
      where: {
        is_active: true,
      },
      select: {
        university_id: true,
        name: true,
        description: true,
        img_url: true,
        slug: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async getPharmacistAdmission(slug: string) {
    const university = await this.prisma.university.findUnique({
      where: {
        slug,
      },
      select: {
        university_id: true,
        name: true,
        description: true,
        img_url: true,
      },
    });

    if (!university) return { pharmacist_admissions: [], mentors: [] };

    const [pharmacist_admissions, mentors] = await this.prisma.$transaction([
      this.prisma.pharmacistAdmission.findMany({
        where: {
          university: {
            slug,
          },
          is_active: true,
        },
        select: {
          pa_id: true,
          title: true,
          description: true,
          price: true,
          link_order: true,
          thumbnail_url: true,
          thumbnail_type: true,
          slug: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.classMentor.findMany({
        where: {
          type: 'pharmacist_admission',
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
      ...university,
      pharmacist_admissions,
      mentors: mentors.map((mentor) => {
        return {
          class_mentor_id: mentor.class_mentor_id,
          ...mentor.mentor,
        };
      }),
    };
  }
}
