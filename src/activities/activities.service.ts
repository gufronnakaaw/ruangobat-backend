import { Injectable } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { parseSortQuery } from '../utils/string.util';
import { ActivitiesQuery, CreateProductLogDto } from './activities.dto';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async getProductLogs(type: string, query: ActivitiesQuery) {
    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = { product_type: type };

    if (query.q) {
      where.OR = [
        { product_name: { contains: query.q } },
        { user: { fullname: { contains: query.q } } },
        { user: { user_id: { contains: query.q } } },
      ];
    }

    if (query.filter) {
      where.action = query.filter;
    }

    const [total_logs, products] = await this.prisma.$transaction([
      this.prisma.logProduct.count({
        where,
      }),
      this.prisma.logProduct.findMany({
        where,
        select: {
          product_name: true,
          product_type: true,
          action: true,
          user: {
            select: {
              user_id: true,
              fullname: true,
            },
          },
        },
        take,
        skip,
        orderBy: query.sort
          ? parseSortQuery(query.sort, ['created_at'])
          : { created_at: 'desc' },
      }),
    ]);

    return {
      products: products.map(({ user, ...rest }) => ({ ...user, ...rest })),
      page,
      total_logs,
      total_pages: Math.ceil(total_logs / take),
    };
  }

  createProductLog(body: CreateProductLogDto) {
    return this.prisma.logProduct.create({
      data: {
        user_id: body.user_id,
        product_id: body.product_id,
        product_name: body.product_name,
        action: body.action,
        product_type: body.product_type,
      },
      select: {
        id: true,
      },
    });
  }
}
