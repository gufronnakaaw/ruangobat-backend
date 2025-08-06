import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { random } from 'lodash';
import { UAParser } from 'ua-parser-js';
import { hashPassword, verifyPassword } from '../utils/bcrypt.util';
import { encryptString, hashString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import {
  capitalize,
  generateEmailTemplate,
  getInitials,
} from '../utils/string.util';
import {
  AdminLoginDto,
  AdminRegisterDto,
  UserLoginDto,
  UserRegisterDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  async adminRegister(body: AdminRegisterDto) {
    if (body.access_key !== process.env.ACCESS_KEY) {
      throw new ForbiddenException();
    }

    const admin_id =
      body.role === 'superadmin'
        ? `ROSA${random(1000, 9999)}`
        : `ROA${random(10000, 99999)}`;

    return this.prisma.admin.create({
      data: {
        admin_id,
        fullname: capitalize(body.fullname.toLowerCase()),
        password: await hashPassword(body.password),
        role: body.role,
      },
      select: {
        admin_id: true,
        fullname: true,
        role: true,
      },
    });
  }

  async adminLogin(body: AdminLoginDto) {
    const admin = await this.prisma.admin.findUnique({
      where: {
        admin_id: body.admin_id,
      },
      select: {
        admin_id: true,
        fullname: true,
        role: true,
        password: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('Admin ID atau password salah');
    }

    if (!(await verifyPassword(body.password, admin.password))) {
      throw new BadRequestException('Admin ID atau password salah');
    }

    const date = new Date();
    const expired = new Date();
    expired.setHours(date.getHours() + 6);

    const ua_parser = UAParser(body.user_agent);

    await this.prisma.logLogin.create({
      data: {
        admin_id: admin.admin_id,
        user_agent: body.user_agent,
        os: `${ua_parser.os.name} ${ua_parser.os.version}`,
        type: 'admin',
      },
    });

    return {
      admin_id: admin.admin_id,
      fullname: admin.fullname,
      role: admin.role,
      expired_at: expired,
      access_token: await this.jwtService.signAsync({
        admin_id: admin.admin_id,
        role: admin.role,
        fullname: admin.fullname,
      }),
    };
  }

  async userRegister(body: UserRegisterDto) {
    await this.jwtService.verifyAsync(body.token, {
      secret: process.env.JWT_SECRET_KEY,
    });

    const email_hash = hashString(body.email, process.env.ENCRYPT_KEY);
    const phone_hash = hashString(body.phone_number, process.env.ENCRYPT_KEY);
    const email_enc = encryptString(body.email, process.env.ENCRYPT_KEY);
    const phone_enc = encryptString(body.phone_number, process.env.ENCRYPT_KEY);

    if (await this.prisma.user.count({ where: { email_hash } })) {
      throw new BadRequestException('Email sudah digunakan');
    }

    if (await this.prisma.user.count({ where: { phone_hash } })) {
      throw new BadRequestException('Nomor telepon sudah digunakan');
    }

    const fullname = capitalize(body.fullname.toLowerCase());
    const university = capitalize(body.university.toLowerCase());

    const user = await this.prisma.user.create({
      data: {
        user_id: `ROU${getInitials(fullname)}${random(100000, 999999)}`,
        email: email_enc,
        phone_number: phone_enc,
        email_hash,
        phone_hash,
        fullname,
        gender: body.gender,
        password: await hashPassword(body.password),
        university,
        entry_year: body.entry_year,
        is_verified: true,
      },
      select: {
        user_id: true,
      },
    });

    if (process.env.EMAIL_ACTIVE === 'true') {
      this.mailerService
        .sendMail({
          from: `RuangObat <${process.env.EMAIL_ALIAS_TWO}>`,
          to: body.email,
          subject: 'Yeay! Kamu berhasil daftar! 🎉',
          html: generateEmailTemplate({
            fullname,
            env: process.env.MODE,
            type: ['register'],
          }),
        })
        .catch(console.error);
    }

    return user;
  }

  async userLogin(body: UserLoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email_hash: hashString(body.email, process.env.ENCRYPT_KEY) },
      select: {
        user_id: true,
        fullname: true,
        password: true,
        is_verified: true,
        gender: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Email atau password salah');
    }

    if (!(await verifyPassword(body.password, user.password))) {
      throw new BadRequestException('Email atau password salah');
    }

    const date = new Date();
    const expired = new Date();
    expired.setHours(date.getHours() + 12);

    const ua_parser = UAParser(body.user_agent);

    await this.prisma.logLogin.create({
      data: {
        user_id: user.user_id,
        user_agent: body.user_agent,
        os: `${ua_parser.os.name} ${ua_parser.os.version}`,
        type: 'user',
      },
    });

    return {
      user_id: user.user_id,
      fullname: user.fullname,
      expired_at: expired,
      gender: user.gender,
      is_verified: user.is_verified,
      access_token: await this.jwtService.signAsync(
        {
          user_id: user.user_id,
          role: 'user',
        },
        {
          expiresIn: '13h',
        },
      ),
    };
  }

  async checkSession(user_id: string) {
    const session = await this.prisma.session.findFirst({
      where: { user_id },
      select: { session_id: true },
    });

    if (!session) {
      throw new NotFoundException('Sesi tidak ditemukan');
    }

    return {
      message: 'Sesi aktif',
      session_id: session.session_id,
    };
  }

  async userLogout(user_id: string) {
    if (!(await this.prisma.session.count({ where: { user_id } }))) {
      throw new NotFoundException('Sesi tidak ditemukan');
    }

    return this.prisma.session.deleteMany({
      where: { user_id },
    });
  }
}
