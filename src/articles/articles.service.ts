import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { parseIsActive, parseSortQuery, slug } from '../utils/string.util';
import {
  ArticlesQuery,
  CreateArticleDto,
  UpdateArticleDto,
} from './articles.dto';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private storage: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getArticles(query: ArticlesQuery) {
    const default_page = 1;
    const take = 9;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {};

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { slug: { contains: query.q } },
      ];

      where.topic = {
        OR: [
          { name: { contains: query.q } },
          { first_letter: { contains: query.q } },
        ],
      };
    }

    const [total_articles, articles] = await this.prisma.$transaction([
      this.prisma.article.count({
        where,
      }),
      this.prisma.article.findMany({
        where,
        take,
        skip,
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
        select: {
          topic: {
            select: {
              name: true,
              first_letter: true,
            },
          },
          article_id: true,
          title: true,
          slug: true,
          img_url: true,
          description: true,
          created_at: true,
          created_by: true,
          views: true,
        },
      }),
    ]);

    return {
      articles,
      page,
      total_articles,
      total_pages: Math.ceil(total_articles / take),
    };
  }

  async getArticlesHomepage() {
    const most_viewed = await this.prisma.article.findMany({
      where: {
        is_active: true,
      },
      select: {
        article_id: true,
        title: true,
        slug: true,
        img_url: true,
        description: true,
        created_at: true,
        created_by: true,
        topic: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        views: 'desc',
      },
      take: 5,
    });

    const newest = await this.prisma.article.findMany({
      where: {
        is_active: true,
        article_id: {
          notIn: most_viewed.map((article) => article.article_id),
        },
      },
      select: {
        article_id: true,
        title: true,
        slug: true,
        img_url: true,
        description: true,
        created_at: true,
        created_by: true,
        topic: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 5,
    });

    const ads = await this.prisma.ad.findMany({
      where: {
        is_active: true,
        type: 'homepage',
      },
      select: {
        ad_id: true,
        type: true,
        link: true,
        img_url: true,
        title: true,
      },
    });

    return {
      newest_articles: newest,
      most_viewed_articles: most_viewed,
      ads,
    };
  }

  async getArticlesByTopic(topic: string, query: ArticlesQuery) {
    const default_page = 1;
    const take = 9;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = {
      topic: {
        OR: [
          { name: { contains: topic } },
          { first_letter: { contains: topic } },
        ],
      },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { slug: { contains: query.q } },
      ];
    }

    const [total_articles, articles] = await this.prisma.$transaction([
      this.prisma.article.count({
        where,
      }),
      this.prisma.article.findMany({
        where,
        take,
        skip,
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at', 'title'])
          : { created_at: 'desc' },
        select: {
          topic: {
            select: {
              name: true,
              first_letter: true,
            },
          },
          article_id: true,
          title: true,
          slug: true,
          img_url: true,
          description: true,
          created_at: true,
          created_by: true,
          views: true,
        },
      }),
    ]);

    return {
      articles,
      page,
      total_articles,
      total_pages: Math.ceil(total_articles / take),
    };
  }

  async getPublicArticle(id_or_slug: string) {
    const [article, ads] = await this.prisma.$transaction([
      this.prisma.article.findFirst({
        where: {
          OR: [{ article_id: id_or_slug }, { slug: id_or_slug }],
        },
        select: {
          article_id: true,
          title: true,
          slug: true,
          img_url: true,
          content: true,
          description: true,
          created_at: true,
          created_by: true,
          topic: {
            select: {
              name: true,
            },
          },
          views: true,
        },
      }),
      this.prisma.ad.findMany({
        where: {
          is_active: true,
          type: 'detailpage',
        },
        select: {
          ad_id: true,
          type: true,
          link: true,
          img_url: true,
          title: true,
        },
      }),
    ]);

    if (!article) throw new NotFoundException('Artikel tidak ditemukan');

    const key = `article:${article.article_id}:views`;
    const current = await this.cacheManager.get<{
      count: number;
      lastUpdate: number;
    }>(key);

    await this.cacheManager.set(
      key,
      {
        count: (current?.count || 0) + 1,
        lastUpdate: Date.now(),
      },
      180000,
    );

    return {
      ...article,
      topic: article.topic.name,
      ads,
    };
  }

  async getArticle(id_or_slug: string) {
    return this.prisma.article.findFirst({
      where: {
        OR: [{ article_id: id_or_slug }, { slug: id_or_slug }],
      },
      select: {
        article_id: true,
        title: true,
        slug: true,
        img_url: true,
        content: true,
        description: true,
        created_at: true,
        created_by: true,
        topic: {
          select: {
            name: true,
            first_letter: true,
          },
        },
        views: true,
      },
    });
  }

  async createArticle(
    body: CreateArticleDto,
    file: Express.Multer.File,
    by: string,
  ) {
    const key = `articles/${Date.now()}-${file.originalname}`;

    const url = await this.storage.uploadFile({
      buffer: file.buffer,
      key,
      mimetype: file.mimetype,
    });

    return this.prisma.article.create({
      data: {
        title: body.title,
        slug: slug(body.title),
        topic_id: body.topic_id,
        content: body.content,
        description: body.description,
        img_key: key,
        img_url: url,
        is_active: parseIsActive(body.is_active),
        created_by: by,
        updated_by: by,
      },
      select: {
        article_id: true,
      },
    });
  }

  async updateArticle(
    body: UpdateArticleDto,
    file: Express.Multer.File,
    by: string,
  ) {
    const article = await this.prisma.article.findFirst({
      where: {
        article_id: body.article_id,
      },
      select: {
        img_key: true,
      },
    });

    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    let key = '';
    let url = '';

    if (file) {
      key = `articles/${Date.now()}-${file.originalname}`;
      url = await this.storage.uploadFile({
        buffer: file.buffer,
        key,
        mimetype: file.mimetype,
      });
      await this.storage.deleteFile(article.img_key);
    }

    return this.prisma.article.update({
      where: {
        article_id: body.article_id,
      },
      data: {
        title: body.title,
        slug: body.title ? slug(body.title) : undefined,
        topic_id: body.topic_id,
        content: body.content,
        description: body.description,
        is_active: parseIsActive(body.is_active),
        img_key: key ? key : undefined,
        img_url: url ? url : undefined,
        updated_by: by,
      },
      select: {
        article_id: true,
      },
    });
  }

  async deleteArticle(article_id: string) {
    const article = await this.prisma.article.findFirst({
      where: { article_id },
      select: { article_id: true },
    });

    if (!article) {
      throw new NotFoundException('Artikel tidak ditemukan');
    }

    return this.prisma.article.delete({
      where: { article_id },
      select: { article_id: true },
    });
  }
}
