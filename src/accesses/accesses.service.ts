import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessType, OrderItemType, SubscriptionType } from '@prisma/client';
import { Request } from 'express';
import { DateTime } from 'luxon';
import ShortUniqueId from 'short-unique-id';
import { PrismaService } from '../utils/services/prisma.service';
import {
  generateInvoiceNumberCustom,
  parseSortQuery,
} from '../utils/string.util';
import {
  AccessesQuery,
  CreateAccessDto,
  RevokeAccessDto,
  UpdatePlanDto,
  UpsertTestsDto,
} from './accesses.dto';

@Injectable()
export class AccessesService {
  constructor(private prisma: PrismaService) {}

  async getAccessList(type: AccessType, query: AccessesQuery) {
    if (
      !['videocourse', 'apotekerclass', 'videoukmppai', 'book', 'ai'].includes(
        type,
      )
    ) {
      return [];
    }

    const default_page = 1;
    const take = 10;
    const page = Number(query.page) || default_page;
    const skip = (page - 1) * take;

    const where: any = { type };

    if (!query.filter) {
      where.status = 'active';
    } else {
      where.status = query.filter;
    }

    if (query.q) {
      where.user = {
        OR: [
          { user_id: { contains: query.q } },
          { fullname: { contains: query.q } },
        ],
      };
    }

    const [total_accesses, accesses] = await this.prisma.$transaction([
      this.prisma.access.count({ where }),
      this.prisma.access.findMany({
        where,
        select: {
          access_id: true,
          type: true,
          duration: true,
          status: true,
          is_active: true,
          user_timezone: true,
          created_at: true,
          started_at: true,
          expired_at: true,
          update_reason: true,
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
          ? parseSortQuery(query.sort, ['created_at', 'duration'])
          : { created_at: 'desc' },
      }),
    ]);

    return {
      accesses: accesses.map(({ user, ...rest }) => ({ ...rest, ...user })),
      page,
      total_accesses,
      total_pages: Math.ceil(total_accesses / take),
    };
  }

  async getAccessDetail(access_id: string) {
    const access = await this.prisma.access.findUnique({
      where: { access_id },
      select: {
        access_id: true,
        type: true,
        duration: true,
        status: true,
        is_active: true,
        user_timezone: true,
        created_at: true,
        started_at: true,
        expired_at: true,
        update_reason: true,
        user: {
          select: {
            user_id: true,
            fullname: true,
          },
        },
        order: {
          select: {
            order_id: true,
            invoice_number: true,
            total_amount: true,
            final_amount: true,
            paid_amount: true,
            discount_amount: true,
            discount_code: true,
            status: true,
            items: {
              select: {
                item_id: true,
                product_id: true,
                product_name: true,
                product_type: true,
                product_price: true,
              },
            },
          },
        },
        accesstest: {
          select: {
            access_test_id: true,
            univ_id: true,
            granted_at: true,
            granted_by: true,
            university: {
              select: {
                title: true,
              },
            },
          },
          orderBy: {
            university: {
              title: 'asc',
            },
          },
        },
      },
    });

    if (!access) {
      return {};
    }

    const { user, order, accesstest, ...rest } = access;

    return {
      ...rest,
      ...user,
      order,
      universities: accesstest.map((university) => {
        return {
          ...university.university,
          access_test_id: university.access_test_id,
          granted_at: university.granted_at,
          granted_by: university.granted_by,
        };
      }),
    };
  }

  async createAccess(body: CreateAccessDto, req: Request) {
    if (
      !['videocourse', 'apotekerclass', 'videoukmppai'].includes(
        body.type_access,
      )
    ) {
      throw new ForbiddenException('Access type not allowed');
    }

    const existing_order = await this.prisma.order.findUnique({
      where: { idempotency_key: body.idempotency_key },
      select: { order_id: true },
    });

    if (existing_order) {
      return existing_order;
    }

    const product = await this.prisma.subscriptionPackage.findFirst({
      where: {
        package_id: body.product_id,
        type: body.product_type as SubscriptionType,
      },
      select: {
        package_id: true,
        duration: true,
        price: true,
        name: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    const until = today.plus({ days: 1 });

    const uid = new ShortUniqueId();

    const order = await this.prisma.$transaction(async (tx) => {
      const total_order = await tx.order.count({
        where: {
          created_at: {
            gte: today.toJSDate(),
            lt: until.toJSDate(),
          },
        },
      });

      const year_format = DateTime.now()
        .setZone('Asia/Jakarta')
        .toFormat('yyyyMMdd');

      const invoice_number = generateInvoiceNumberCustom(
        'INV',
        'RO',
        year_format,
        total_order,
      );

      const transaction_id = `ROTX-${year_format}-${uid.rnd(7).toUpperCase()}`;
      const date = new Date();

      const expired_access = DateTime.now()
        .setZone(body.user_timezone)
        .endOf('day')
        .plus({ months: product.duration })
        .toUTC()
        .toJSDate();

      return tx.order.create({
        data: {
          idempotency_key: body.idempotency_key,
          invoice_number,
          order_id: `ROORDER-${year_format}-${uid.rnd(7).toUpperCase()}`,
          user_id: body.user_id,
          total_amount: product.price,
          final_amount: product.price - (body.discount_amount || 0),
          paid_amount: product.price - (body.discount_amount || 0),
          discount_amount: body.discount_amount || 0,
          discount_code: body.discount_code || null,
          created_by: req.admin.fullname,
          updated_by: req.admin.fullname,
          paid_at: date,
          status: 'paid',
          items: {
            create: {
              product_id: body.product_id,
              product_name: product.name,
              product_type: body.product_type as OrderItemType,
              product_price: product.price,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
            },
          },
          transactions: {
            create: {
              request_id: body.idempotency_key,
              transaction_id,
              external_id: transaction_id,
              gateway: 'manual',
              normalized_method: 'manual',
              paid_amount: product.price - (body.discount_amount || 0),
              payment_method: 'manual',
              status: 'success',
              paid_at: date,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
            },
          },
          access: {
            create: {
              user_timezone: body.user_timezone,
              status: 'active',
              user_id: body.user_id,
              type: body.type_access,
              duration: product.duration,
              is_active: true,
              started_at: date,
              expired_at: expired_access,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
              ...(body.type_access === 'apotekerclass'
                ? {
                    accesstest: {
                      createMany: {
                        data: body.univ_tests.map((univ) => {
                          return {
                            univ_id: univ,
                            user_id: body.user_id,
                            granted_by: req.admin.fullname,
                          };
                        }),
                      },
                    },
                  }
                : {}),
            },
          },
        },
        select: {
          order_id: true,
        },
      });
    });

    return order;
  }

  async updatePlan(body: UpdatePlanDto, req: Request) {
    if (
      !['videocourse', 'apotekerclass', 'videoukmppai'].includes(
        body.type_access,
      )
    ) {
      throw new ForbiddenException('Access type not allowed');
    }

    const existing_order = await this.prisma.order.findUnique({
      where: { idempotency_key: body.idempotency_key },
      select: { order_id: true },
    });

    if (existing_order) {
      return existing_order;
    }

    const product = await this.prisma.subscriptionPackage.findFirst({
      where: {
        package_id: body.product_id,
        type: body.product_type as SubscriptionType,
      },
      select: {
        package_id: true,
        duration: true,
        price: true,
        name: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const access = await this.prisma.access.findUnique({
      where: { access_id: body.access_id },
      select: {
        order_id: true,
        started_at: true,
        user_id: true,
        accesstest: {
          select: {
            univ_id: true,
          },
        },
      },
    });

    if (!access) {
      throw new NotFoundException('Access not found');
    }

    await this.prisma.$transaction([
      this.prisma.access.update({
        where: {
          access_id: body.access_id,
        },
        data: {
          status: 'revoked',
          is_active: false,
          updated_by: req.admin.fullname,
          update_reason: 'change plan',
        },
      }),
      this.prisma.order.update({
        where: {
          order_id: access.order_id,
        },
        data: {
          status: 'replaced',
          updated_by: req.admin.fullname,
        },
      }),
      this.prisma.accessRevokeLog.create({
        data: {
          access_id: body.access_id,
          reason: 'change plan',
          created_by: req.admin.fullname,
        },
      }),
    ]);

    const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    const until = today.plus({ days: 1 });

    const uid = new ShortUniqueId();

    const order = await this.prisma.$transaction(async (tx) => {
      const total_order = await tx.order.count({
        where: {
          created_at: {
            gte: today.toJSDate(),
            lt: until.toJSDate(),
          },
        },
      });

      const year_format = DateTime.now()
        .setZone('Asia/Jakarta')
        .toFormat('yyyyMMdd');

      const invoice_number = generateInvoiceNumberCustom(
        'INV',
        'RO',
        year_format,
        total_order,
      );

      const transaction_id = `ROTX-${year_format}-${uid.rnd(7).toUpperCase()}`;
      const date = new Date(access.started_at);

      const expired_access = DateTime.fromJSDate(date)
        .setZone(body.user_timezone)
        .endOf('day')
        .plus({ months: product.duration })
        .toUTC()
        .toJSDate();

      return tx.order.create({
        data: {
          idempotency_key: body.idempotency_key,
          invoice_number,
          order_id: `ROORDER-${year_format}-${uid.rnd(7).toUpperCase()}`,
          user_id: access.user_id,
          total_amount: product.price,
          final_amount: product.price - (body.discount_amount || 0),
          paid_amount: product.price - (body.discount_amount || 0),
          discount_amount: body.discount_amount || 0,
          discount_code: body.discount_code || null,
          created_by: req.admin.fullname,
          updated_by: req.admin.fullname,
          paid_at: date,
          status: 'paid',
          items: {
            create: {
              product_id: body.product_id,
              product_name: product.name,
              product_type: body.product_type as OrderItemType,
              product_price: product.price,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
            },
          },
          transactions: {
            create: {
              request_id: body.idempotency_key,
              transaction_id,
              external_id: transaction_id,
              gateway: 'manual',
              normalized_method: 'manual',
              paid_amount: product.price - (body.discount_amount || 0),
              payment_method: 'manual',
              status: 'success',
              paid_at: date,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
            },
          },
          access: {
            create: {
              user_timezone: body.user_timezone,
              status: 'active',
              user_id: access.user_id,
              type: body.type_access,
              duration: product.duration,
              is_active: true,
              started_at: date,
              expired_at: expired_access,
              created_by: req.admin.fullname,
              updated_by: req.admin.fullname,
              ...(body.type_access === 'apotekerclass'
                ? {
                    accesstest: {
                      createMany: {
                        data: access.accesstest.map((univ) => {
                          return {
                            univ_id: univ.univ_id,
                            user_id: access.user_id,
                            granted_by: req.admin.fullname,
                          };
                        }),
                      },
                    },
                  }
                : {}),
            },
          },
        },
        select: {
          order_id: true,
        },
      });
    });

    return order;
  }

  async createAccessTest(body: UpsertTestsDto, req: Request) {
    if (
      !(await this.prisma.access.count({
        where: { access_id: body.access_id },
      }))
    ) {
      throw new NotFoundException('Access not found');
    }

    const promises = [];

    for (const element of body.univ_tests) {
      promises.push(
        this.prisma.accessTest.upsert({
          where: {
            access_test_id: element.access_test_id,
          },
          update: {
            univ_id: element.univ_id,
            updated_by: req.admin.fullname,
          },
          create: {
            access_id: body.access_id,
            univ_id: element.univ_id,
            user_id: body.user_id,
            granted_by: req.admin.fullname,
            updated_by: req.admin.fullname,
          },
        }),
      );
    }

    await this.prisma.$transaction(promises);

    return body;
  }

  async deleteAccessTest(access_test_id: string) {
    if (!(await this.prisma.accessTest.count({ where: { access_test_id } }))) {
      throw new NotFoundException('Access test not found');
    }

    return this.prisma.accessTest.delete({
      where: { access_test_id },
      select: {
        access_test_id: true,
      },
    });
  }

  async revokeAccess(body: RevokeAccessDto, req: Request) {
    const access = await this.prisma.access.findUnique({
      where: { access_id: body.access_id },
      select: { status: true },
    });
    if (!access) throw new NotFoundException('Access not found');

    if (['revoked', 'expired'].includes(access.status)) {
      throw new ForbiddenException('Access is no longer active');
    }

    await this.prisma.$transaction([
      this.prisma.access.update({
        where: { access_id: body.access_id },
        data: {
          status: 'revoked',
          is_active: false,
          updated_by: req.admin.fullname,
          update_reason: body.reason,
          revokelog: {
            create: {
              reason: body.reason,
              created_by: req.admin.fullname,
            },
          },
        },
      }),
    ]);

    return { access_id: body.access_id };
  }
}
