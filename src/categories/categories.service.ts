import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive, parseSortQuery, slug } from '../utils/string.util';
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

  async getCategories(query: CategoriesQuery) {
    if (
      !['videocourse', 'apotekerclass', 'videoukmppai'].includes(query.type)
    ) {
      return [];
    }

    const where: any = { type: query.type };

    if (query.filter === 'inactive') {
      where.is_active = false;
    } else {
      where.is_active = true;
    }

    const categories = await this.prisma.category.findMany({
      where,
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
      orderBy: query.sort
        ? parseSortQuery(query.sort, ['name', 'created_at'])
        : { name: 'asc' },
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
    type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    query: CategoriesQuery,
  ) {
    if (!['videocourse', 'apotekerclass', 'videoukmppai'].includes(type)) {
      return {};
    }

    const where_subcategories: any = {};

    if (query.filter === 'inactive') {
      where_subcategories.is_active = false;
    } else {
      where_subcategories.is_active = true;
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
        type,
      },
      select: {
        category_id: true,
        name: true,
        slug: true,
        img_url: true,
        type: true,
        subcategory: {
          where: where_subcategories,
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
            is_active: true,
          },
          orderBy: query.sort
            ? parseSortQuery(query.sort, ['name', 'created_at'])
            : { name: 'asc' },
        },
      },
    });

    if (!category) return {};

    const { subcategory, ...rest } = category;

    return {
      ...rest,
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

    const [updated_category] = await this.prisma.$transaction([
      this.prisma.category.update({
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
      }),
      this.prisma.subCategory.updateMany({
        where: { category_id: body.category_id },
        data: { is_active: parseIsActive(body.is_active), updated_by: body.by },
      }),
    ]);

    return updated_category;
  }

  async getSubCategory(
    id_or_slug: string,
    type: 'videocourse' | 'videoukmppai',
    query: CategoriesQuery,
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
          is_active: true,
        },
        select: {
          sub_category_id: true,
          name: true,
          slug: true,
          img_url: true,
          is_active: true,
        },
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['name', 'created_at'])
          : { name: 'asc' },
      });

      return {
        name: 'All',
        img_url: null,
        sub_categories: subcategories,
      };
    }

    const where_subcategories: any = {};

    if (query.filter === 'inactive') {
      where_subcategories.is_active = false;
    } else {
      where_subcategories.is_active = true;
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
        type,
      },
      select: {
        name: true,
        img_url: true,
        subcategory: {
          where: where_subcategories,
          select: {
            sub_category_id: true,
            name: true,
            slug: true,
            img_url: true,
            is_active: true,
          },
          orderBy: query.sort
            ? parseSortQuery(query.sort, ['name', 'created_at'])
            : { name: 'asc' },
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
