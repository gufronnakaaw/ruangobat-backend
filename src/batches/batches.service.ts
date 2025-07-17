import { ForbiddenException, Injectable } from '@nestjs/common';
import { random } from 'lodash';
import { removeKeys } from '../utils/array.util';
import { hashPassword } from '../utils/bcrypt.util';
import { encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { capitalize, getInitials } from '../utils/string.util';
import { CreateBatchUsersDto } from './batches.dto';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async createBulkUsers(body: CreateBatchUsersDto) {
    if (body.access_key !== process.env.ACCESS_KEY) {
      throw new ForbiddenException();
    }

    const users_data: {
      user_id: string;
      password: string;
      fullname: string;
      email: string;
      phone_number: string;
      university: string;
      gender: 'M' | 'F';
      is_verified: boolean;
    }[] = [];

    for (const user of body.users) {
      users_data.push({
        user_id: `ROU${getInitials(user.fullname)}${random(100000, 999999)}`,
        email: encryptString(user.email, process.env.ENCRYPT_KEY),
        phone_number: encryptString(user.phone_number, process.env.ENCRYPT_KEY),
        fullname: capitalize(user.fullname.toLowerCase()),
        gender: user.gender,
        password: await hashPassword(
          user.password ? user.password : process.env.DEFAULT_PASSWORD_USER,
        ),
        university: capitalize(user.university.toLowerCase()),
        is_verified: true,
      });
    }

    await this.prisma.user.createMany({
      data: users_data,
    });

    return users_data.map((user) => {
      return removeKeys(user, ['password']);
    });
  }
}
