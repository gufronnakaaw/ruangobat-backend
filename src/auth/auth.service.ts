import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { random } from 'lodash';
import { hashPassword, verifyPassword } from '../utils/bcrypt.util';
import { capitalize } from '../utils/capitalize.util';
import { decryptString, encryptString } from '../utils/crypto.util';
import { getInitials } from '../utils/getinitials.util';
import { PrismaService } from '../utils/services/prisma.service';
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

    return {
      admin_id: admin.admin_id,
      fullname: admin.fullname,
      expired,
      access_token: await this.jwtService.signAsync({
        admin_id: admin.admin_id,
        role: admin.role,
      }),
    };
  }

  async userRegister(body: UserRegisterDto) {
    const users = await this.prisma.user.findMany({
      select: { email: true, phone_number: true },
    });

    const decrypts = users.map((user) => {
      return {
        email: decryptString(user.email, process.env.ENCRYPT_KEY),
        phone_number: decryptString(user.phone_number, process.env.ENCRYPT_KEY),
      };
    });

    if (decrypts.find((user) => user.email == body.email)) {
      throw new BadRequestException('Email sudah digunakan');
    }

    if (decrypts.find((user) => user.phone_number == body.phone_number)) {
      throw new BadRequestException('Nomor telepon sudah digunakan');
    }

    const fullname = capitalize(body.fullname.toLowerCase());

    return this.prisma.user.create({
      data: {
        user_id: `ROU${getInitials(fullname)}${random(100000, 999999)}`,
        email: encryptString(body.email, process.env.ENCRYPT_KEY),
        phone_number: encryptString(body.phone_number, process.env.ENCRYPT_KEY),
        fullname,
        gender: body.gender,
        password: await hashPassword(body.password),
        university: capitalize(body.university.toLowerCase()),
      },
      select: {
        user_id: true,
        fullname: true,
        gender: true,
        university: true,
      },
    });
  }

  async userLogin(body: UserLoginDto, user_agent: string) {
    const users = await this.prisma.user.findMany({
      select: {
        email: true,
        password: true,
        user_id: true,
        fullname: true,
        gender: true,
      },
    });

    const decrypts = users.map((user) => {
      return {
        ...user,
        email: decryptString(user.email, process.env.ENCRYPT_KEY),
      };
    });

    const user = decrypts.find((user) => user.email == body.email);

    if (!user) {
      throw new BadRequestException('Email atau password salah');
    }

    if (!(await verifyPassword(body.password, user.password))) {
      throw new BadRequestException('Email atau password salah');
    }

    // if (await this.prisma.session.count({ where: { user_id: user.user_id } })) {
    //   throw new ConflictException('Sesi login anda sedang aktif');
    // }

    const date = new Date();
    const expired = new Date();
    expired.setHours(date.getHours() + 12);

    // const ua_parser = UAParser(user_agent);

    // await this.prisma.session.create({
    //   data: {
    //     user_id: user.user_id,
    //     browser: ua_parser.browser.name,
    //     os: `${ua_parser.os.name} ${ua_parser.os.version}`,
    //     expired,
    //     created_at: date,
    //   },
    // });

    return {
      user_id: user.user_id,
      fullname: user.fullname,
      expired,
      gender: user.gender,
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
    const session = await this.prisma.session.findUnique({
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

    return this.prisma.session.delete({
      where: { user_id },
      select: { user_id: true },
    });
  }
}
