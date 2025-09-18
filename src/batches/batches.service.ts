import { ForbiddenException, Injectable } from '@nestjs/common';
import { random } from 'lodash';
import { hashPassword } from '../utils/bcrypt.util';
import { encryptString, hashString } from '../utils/crypto.util';
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

    const users_data = [];

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
        email_hash: hashString(user.email, process.env.ENCRYPT_KEY),
        phone_hash: hashString(user.phone_number, process.env.ENCRYPT_KEY),
        entry_year: user.entry_year,
        university: capitalize(user.university.toLowerCase()),
        is_verified: true,
      });
    }

    return await this.prisma.$transaction(async (tx) => {
      const email_hashes = users_data.map((user) => user.email_hash);

      const existing_users = await tx.user.findMany({
        where: {
          email_hash: {
            in: email_hashes,
          },
        },
        select: {
          email_hash: true,
          user_id: true,
        },
      });

      const existing_email_hashes = new Set(
        existing_users.map((user) => user.email_hash),
      );

      const results = [];

      for (const user_data of users_data) {
        if (existing_email_hashes.has(user_data.email_hash)) {
          await tx.user.updateMany({
            where: {
              email_hash: user_data.email_hash,
            },
            data: {
              email: user_data.email,
              phone_number: user_data.phone_number,
              fullname: user_data.fullname,
              gender: user_data.gender,
              password: user_data.password,
              phone_hash: user_data.phone_hash,
              entry_year: user_data.entry_year,
              university: user_data.university,
              is_verified: user_data.is_verified,
            },
          });
          results.push({ action: 'updated', email_hash: user_data.email_hash });
        } else {
          const result = await tx.user.create({
            data: user_data,
          });
          results.push({ action: 'created', user_id: result.user_id });
        }
      }

      return results;
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
      skipDuplicates: true,
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
      skipDuplicates: true,
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
      skipDuplicates: true,
    });
  }
}
