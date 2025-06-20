import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive, slug } from '../utils/string.util';
import {
  CategoriesQuery,
  CreateCategoryDto,
  CreateSubCategoryDto,
  UpdateCategoryDto,
  UpdateSubCategoryDto,
} from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async getCategories(query: CategoriesQuery, role: string) {
    if (
      !['videocourse', 'apotekerclass', 'videoukmppai'].includes(query.type)
    ) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: {
        ...(role === 'admin' ? { is_active: true } : {}),
        type: query.type,
      },
      select: {
        category_id: true,
        name: true,
        slug: true,
        img_url: true,
        type: true,
        created_at: true,
        created_by: true,
        _count: {
          select: {
            subcategory: true,
          },
        },
      },
    });

    return categories.map((category) => {
      const { _count, ...rest } = category;

      return {
        ...rest,
        total_sub_category: _count.subcategory,
      };
    });
  }

  async getCategory(
    id_or_slug: string,
    role: string,
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
        ...(role === 'admin' ? { is_active: true } : {}),
        type,
      },
      select: {
        category_id: true,
        name: true,
        slug: true,
        img_url: true,
        type: true,
        subcategory: {
          where: { ...(role === 'admin' ? { is_active: true } : {}) },
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
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

  async createCategory(file: Express.Multer.File, body: CreateCategoryDto) {
    const key = `categories/${Date.now()}-${file.originalname}`;

    const url = await this.storage.uploadFile({
      buffer: file.buffer,
      key,
      mimetype: file.mimetype,
    });

    return this.prisma.category.create({
      data: {
        name: body.name,
        type: body.type,
        slug: slug(body.name),
        img_key: key,
        img_url: url,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        category_id: true,
        slug: true,
      },
    });
  }

  async updateCategory(file: Express.Multer.File, body: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { category_id: body.category_id },
      select: { img_key: true },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    let url = '';
    let key = '';

    if (file) {
      key += `categories/${Date.now()}-${file.originalname}`;

      const [uploaded_url] = await Promise.all([
        this.storage.uploadFile({
          buffer: file.buffer,
          key,
          mimetype: file.mimetype,
        }),
        this.storage.deleteFile(category.img_key),
      ]);

      url += uploaded_url;
    }

    return this.prisma.category.update({
      where: { category_id: body.category_id },
      data: {
        name: body.name,
        slug: body.name ? slug(body.name) : undefined,
        img_key: key ? key : undefined,
        img_url: url ? url : undefined,
        is_active: parseIsActive(body.is_active),
        updated_by: body.by,
      },
      select: {
        category_id: true,
      },
    });
  }

  async getSubCategory(
    id_or_slug: string,
    role: string,
    type: 'videocourse' | 'videoukmppai',
  ) {
    if (!['videocourse', 'videoukmppai'].includes(type)) {
      return {
        name: null,
        img_url: null,
        sub_categories: [],
      };
    }

    if (id_or_slug === 'all') {
      const subcategories = await this.prisma.subCategory.findMany({
        where: {
          type,
          ...(role === 'admin' ? { is_active: true } : {}),
        },
        select: {
          sub_category_id: true,
          name: true,
          slug: true,
          img_url: true,
          created_at: true,
          created_by: true,
        },
      });

      return {
        name: 'All',
        img_url: null,
        sub_categories: subcategories,
      };
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
        ...(role === 'admin' ? { is_active: true } : {}),
        type,
      },
      select: {
        name: true,
        img_url: true,
        subcategory: {
          where: { ...(role === 'admin' ? { is_active: true } : {}) },
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
          },
        },
      },
    });

    return {
      name: category.name || null,
      img_url: category.img_url || null,
      sub_categories: category.subcategory || [],
    };
  }

  async createSubcategory(
    file: Express.Multer.File,
    body: CreateSubCategoryDto,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { category_id: body.category_id },
      select: { type: true },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    const key = `subcategories/${Date.now()}-${file.originalname}`;

    const url = await this.storage.uploadFile({
      buffer: file.buffer,
      key,
      mimetype: file.mimetype,
    });

    return this.prisma.subCategory.create({
      data: {
        category_id: body.category_id,
        slug: slug(body.name),
        name: body.name,
        type: category.type,
        img_key: key,
        img_url: url,
        created_by: body.by,
        updated_by: body.by,
      },
      select: {
        sub_category_id: true,
      },
    });
  }

  async updateSubcategory(
    file: Express.Multer.File,
    body: UpdateSubCategoryDto,
  ) {
    const sub_category = await this.prisma.subCategory.findUnique({
      where: {
        sub_category_id: body.sub_category_id,
      },
      select: { img_key: true },
    });

    if (!sub_category) {
      throw new NotFoundException('Subkategori tidak ditemukan');
    }

    let url = '';
    let key = '';

    if (file) {
      key += `subcategories/${Date.now()}-${file.originalname}`;

      const [uploaded_url] = await Promise.all([
        this.storage.uploadFile({
          buffer: file.buffer,
          key,
          mimetype: file.mimetype,
        }),
        this.storage.deleteFile(sub_category.img_key),
      ]);

      url += uploaded_url;
    }

    return this.prisma.subCategory.update({
      where: {
        sub_category_id: body.sub_category_id,
      },
      data: {
        name: body.name,
        slug: body.name ? slug(body.name) : undefined,
        img_key: key ? key : undefined,
        img_url: url ? url : undefined,
        is_active: parseIsActive(body.is_active),
        updated_by: body.by,
      },
      select: {
        sub_category_id: true,
      },
    });
  }
}
