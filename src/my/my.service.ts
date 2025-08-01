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
import { parseSortQuery } from '../utils/string.util';
import {
  MyQuery,
  UserChangeEmailDto,
  UserSendEmailDto,
  UserUpdateDto,
} from './my.dto';

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

  async getOrders(user_id: string, query: MyQuery) {
    const default_page = 1;
    const take = 5;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = { user_id };

    if (query.filter) {
      where.status = query.filter;
    }

    const [total_orders, orders] = await this.prisma.$transaction([
      this.prisma.order.count({
        where,
      }),
      this.prisma.order.findMany({
        where,
        select: {
          order_id: true,
          final_amount: true,
          status: true,
          created_at: true,
          items: {
            select: {
              product_id: true,
              product_name: true,
              product_price: true,
              product_type: true,
            },
          },
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at'])
          : { created_at: 'desc' },
        take,
        skip,
      }),
    ]);

    return {
      orders,
      page,
      total_orders,
      total_pages: Math.ceil(total_orders / take),
    };
  }

  async getOrder(order_id: string, user_id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        order_id,
        user_id,
      },
      select: {
        order_id: true,
        invoice_number: true,
        status: true,
        total_amount: true,
        final_amount: true,
        paid_amount: true,
        discount_amount: true,
        discount_code: true,
        created_at: true,
        items: {
          select: {
            product_id: true,
            product_name: true,
            product_price: true,
            product_type: true,
          },
        },
        transactions: {
          select: {
            transaction_id: true,
            status: true,
            payment_method: true,
            normalized_method: true,
            paid_amount: true,
            paid_at: true,
            expired_at: true,
            created_at: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }

  async getSubscriptions(user_id: string) {
    const subscriptions = await this.prisma.access.findMany({
      where: {
        user_id,
        is_active: true,
      },
      select: {
        access_id: true,
        duration: true,
        started_at: true,
        expired_at: true,
        status: true,
        type: true,
        order: {
          select: {
            items: {
              select: {
                product_id: true,
                product_name: true,
                product_type: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return subscriptions.map(({ order, ...rest }) => {
      return {
        ...rest,
        items: order.items,
      };
    });
  }
}
