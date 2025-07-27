import { ForbiddenException, Injectable } from '@nestjs/common';
import { random } from 'lodash';
import { removeKeys } from '../utils/array.util';
import { hashPassword } from '../utils/bcrypt.util';
import { encryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { capitalize, getInitials, slug } from '../utils/string.util';
import {
  CreateBatchCategoriesDto,
  CreateBatchSubCategoriesDto,
  CreateBatchTestimonialsDto,
  CreateBatchUsersDto,
} from './batches.dto';

@Injectable()
export class BatchesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

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

  async createBulkCategories(body: CreateBatchCategoriesDto) {
    const categories = body.categories.map((category) => {
      const url = new URL(category.url);

      return {
        slug: slug(category.name),
        name: category.name,
        type: body.type,
        img_url: category.url,
        img_key: url.pathname.substring(1),
        created_by: body.by,
        updated_by: body.by,
      };
    });

    await this.prisma.category.createMany({
      data: categories,
    });

    return categories;
  }

  async createBulkSubCategories(body: CreateBatchSubCategoriesDto) {
    const subcategories = body.subcategories.map((subcategory) => {
      const url = new URL(subcategory.url);

      return {
        category_id: body.category_id,
        slug: slug(subcategory.name),
        name: subcategory.name,
        type: body.type,
        img_url: subcategory.url,
        img_key: url.pathname.substring(1),
        created_by: body.by,
        updated_by: body.by,
      };
    });

    await this.prisma.subCategory.createMany({
      data: subcategories,
    });

    return subcategories;
  }

  createBulkTestimonials(body: CreateBatchTestimonialsDto) {
    return this.prisma.testimonial.createMany({
      data: body.keys.map((key) => {
        return {
          img_url: this.storage.generatePublicUrl(key),
          type: body.type,
        };
      }),
    });
  }
}
