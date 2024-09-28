import { Injectable } from '@nestjs/common';
import { decryptString } from '../utils/crypto.util';
import { maskEmail, maskPhoneNumber } from '../utils/masking.util';
import { PrismaService } from '../utils/services/prisma.service';
import { UsersQuery } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(query: UsersQuery) {
    const default_page = 1;
    const take = 8;

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
      page: query.page,
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
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

  async searchUsers(query: UsersQuery) {
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
      page: query.page,
      total_users,
      total_pages: Math.ceil(total_users / take),
    };
  }
}
