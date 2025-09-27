import { Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import ShortUniqueId from 'short-unique-id';
import { decryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { generateInvoiceNumberCustom, toE164 } from '../utils/string.util';
import { CreateOrderDto } from './orders.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(
    body: CreateOrderDto,
    user_id: string,
    idempotency_key: string,
  ) {
    const existing_order = await this.prisma.order.findFirst({
      where: { idempotency_key },
      select: { order_id: true },
    });

    if (existing_order) {
      return existing_order;
    }

    const today = DateTime.now().setZone('Asia/Jakarta').startOf('day');
    const until = today.plus({ days: 1 });

    const year_format = DateTime.now()
      .setZone('Asia/Jakarta')
      .toFormat('yyyyMMdd');

    const uid = new ShortUniqueId();

    if (body.product_type === 'tryout') {
      const product = await this.prisma.program.findFirst({
        where: {
          program_id: body.product_id,
          is_active: true,
        },
        select: {
          title: true,
          price: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }

      const order = await this.prisma.$transaction(async (tx) => {
        const total_order = await tx.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM \`order\` 
    WHERE created_at >= ${today.toJSDate()} 
    AND created_at < ${until.toJSDate()} 
    FOR UPDATE
  `;

        const count = Number(total_order[0].count);

        const invoice_number = generateInvoiceNumberCustom(
          'INV',
          'RO',
          year_format,
          count,
        );

        return tx.order.create({
          data: {
            idempotency_key,
            invoice_number,
            user_id,
            order_id: `ROORDER-${year_format}-${uid.rnd(7).toUpperCase()}`,
            total_amount: product.price,
            final_amount: product.price - (body.discount_amount || 0),
            discount_amount: body.discount_amount || 0,
            discount_code: body.discount_code || null,
            status: 'pending',
            expired_at: DateTime.now().plus({ days: 1 }).toJSDate(),
            created_by: 'system',
            updated_by: 'system',
            items: {
              create: {
                product_id: body.product_id,
                product_name: product.title,
                product_type: body.product_type,
                product_price: product.price,
                created_by: 'system',
                updated_by: 'system',
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

    if (
      body.product_type === 'apotekerclass' ||
      body.product_type === 'videocourse'
    ) {
      const product = await this.prisma.subscriptionPackage.findFirst({
        where: {
          package_id: body.product_id,
          type: body.product_type,
          is_active: true,
        },
        select: {
          package_id: true,
          duration: true,
          price: true,
          name: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Produk tidak ditemukan');
      }

      const order = await this.prisma.$transaction(async (tx) => {
        const total_order = await tx.order.count({
          where: {
            created_at: {
              gte: today.toJSDate(),
              lt: until.toJSDate(),
            },
          },
        });

        const invoice_number = generateInvoiceNumberCustom(
          'INV',
          'RO',
          year_format,
          total_order,
        );

        return tx.order.create({
          data: {
            idempotency_key,
            invoice_number,
            user_id,
            order_id: `ROORDER-${year_format}-${uid.rnd(7).toUpperCase()}`,
            total_amount: product.price,
            final_amount: product.price - (body.discount_amount || 0),
            discount_amount: body.discount_amount || 0,
            discount_code: body.discount_code || null,
            status: 'pending',
            expired_at: DateTime.now().plus({ days: 1 }).toJSDate(),
            created_by: 'system',
            updated_by: 'system',
            items: {
              create: {
                product_id: body.product_id,
                product_name: product.name,
                product_type: body.product_type,
                product_price: product.price,
                created_by: 'system',
                updated_by: 'system',
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
  }

  async getOrder(order_id: string, user_id: string) {
    const order = await this.prisma.$transaction(async (tx) => {
      const find_order = await tx.order.findFirst({
        where: {
          order_id,
          user_id,
        },
        select: {
          order_id: true,
          invoice_number: true,
          idempotency_key: true,
          total_amount: true,
          final_amount: true,
          discount_amount: true,
          discount_code: true,
          expired_at: true,
          status: true,
          user: {
            select: {
              fullname: true,
              email: true,
              phone_number: true,
            },
          },
          items: {
            select: {
              product_id: true,
              product_name: true,
              product_type: true,
              product_price: true,
            },
          },
        },
      });

      if (!find_order) {
        throw new NotFoundException('Order tidak ditemukan');
      }

      const item = find_order.items[0];

      if (
        item.product_type === 'apotekerclass' ||
        item.product_type === 'videocourse'
      ) {
        const product = await this.prisma.subscriptionPackage.findFirst({
          where: {
            package_id: item.product_id,
            type: item.product_type,
          },
          select: {
            package_id: true,
            duration: true,
            price: true,
            name: true,
          },
        });

        find_order['details'] = product;
      }

      const { user, ...rest } = find_order;

      return {
        fullname: user.fullname,
        email: decryptString(user.email, process.env.ENCRYPT_KEY),
        phone_number: toE164(
          decryptString(user.phone_number, process.env.ENCRYPT_KEY),
        ),
        ...rest,
      };
    });

    return order;
  }

  async getOrderStatus(order_id: string, user_id: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        order_id,
        user_id,
      },
      select: {
        status: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }
}
