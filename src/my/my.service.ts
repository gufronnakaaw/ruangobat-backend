import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { random } from 'lodash';
import ShortUniqueId from 'short-unique-id';
import { decryptString, encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { UserChangeEmailDto, UserSendEmailDto, UserUpdateDto } from './my.dto';

@Injectable()
export class MyService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async getProfile(user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        email: true,
        fullname: true,
        phone_number: true,
        gender: true,
        university: true,
        created_at: true,
        is_verified: true,
      },
    });

    return {
      ...user,
      email: decryptString(user.email, process.env.ENCRYPT_KEY),
      phone_number: decryptString(user.phone_number, process.env.ENCRYPT_KEY),
    };
  }

  async updateProfile(user_id: string, body: UserUpdateDto) {
    if (!(await this.prisma.user.count({ where: { user_id } }))) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return this.prisma.user.update({
      where: {
        user_id,
      },
      data: {
        fullname: body.fullname,
        phone_number: encryptString(body.phone_number, process.env.ENCRYPT_KEY),
        gender: body.gender,
        university: body.university,
      },
      select: {
        user_id: true,
        fullname: true,
        gender: true,
        university: true,
      },
    });
  }

  async verifyEmail(user_id: string, otp_code: string) {
    const otp = await this.prisma.otp.findMany({
      where: { otp_code, user_id },
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

    await this.prisma.$transaction([
      this.prisma.otp.updateMany({
        where: { otp_code, user_id },
        data: {
          used_at: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { user_id },
        data: {
          is_verified: true,
        },
      }),
    ]);

    return {
      user_id,
      message: 'Akun berhasil diverifikasi',
    };
  }

  async changeEmail(user_id: string, body: UserChangeEmailDto) {
    const otp = await this.prisma.otp.findMany({
      where: { otp_code: body.otp_code, user_id },
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

    const users = await this.prisma.user.findMany({
      select: { email: true, phone_number: true },
    });

    for (const user of users) {
      const email = decryptString(user.email, process.env.ENCRYPT_KEY);
      if (email === body.email) {
        await this.prisma.otp.updateMany({
          where: { otp_code: body.otp_code, user_id },
          data: {
            used_at: new Date(),
          },
        });
        throw new BadRequestException('Email sudah digunakan');
      }
    }

    await this.prisma.$transaction([
      this.prisma.otp.updateMany({
        where: { otp_code: body.otp_code, user_id },
        data: {
          used_at: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { user_id },
        data: {
          is_verified: true,
          email: encryptString(body.email, process.env.ENCRYPT_KEY),
        },
      }),
    ]);

    return {
      user_id,
      message: 'Email berhasil dirubah dan diverifikasi',
    };
  }

  async sendEmailOtp(user_id: string, body: UserSendEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { user_id },
      select: {
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    const otp_code = random(100000, 999999);
    const uid = new ShortUniqueId({ length: 10 });
    const expired_at = new Date();
    expired_at.setMinutes(expired_at.getMinutes() + 5);

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
        to:
          body.type === 'db'
            ? decryptString(user.email, process.env.ENCRYPT_KEY)
            : body.email,
        subject: 'Verification Code (OTP)',
        html: template,
      }),
    ]);

    return {
      user_id,
      message: 'Email terkirim',
    };
  }

  getPrograms(user_id: string) {
    return this.prisma.program.findMany({
      where: {
        participants: {
          some: {
            user_id,
            is_approved: true,
          },
        },
      },
      select: {
        program_id: true,
        title: true,
        type: true,
        price: true,
      },
    });
  }

  async getTests(user_id: string) {
    const tests = await this.prisma.result.findMany({
      where: {
        user_id,
      },
      select: {
        test: {
          select: {
            title: true,
            test_id: true,
          },
        },
        result_id: true,
        score: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return tests.map((test) => {
      return {
        ...test.test,
        result_id: test.result_id,
        score: test.score,
        created_at: test.created_at,
      };
    });
  }
}
