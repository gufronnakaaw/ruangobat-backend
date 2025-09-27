import {
  Injectable,
  NotFoundException,
  RequestTimeoutException,
} from '@nestjs/common';
import { fetch } from 'undici';
import { decryptString } from '../utils/crypto.util';
import { PrismaService } from '../utils/services/prisma.service';
import { toE164 } from '../utils/string.util';
import { CreatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(body: CreatePaymentDto, user_id: string) {
    const [order, transaction] = await this.prisma.$transaction([
      this.prisma.order.findFirst({
        where: {
          order_id: body.order_id,
          user_id,
          status: 'pending',
        },
        select: {
          order_id: true,
          invoice_number: true,
          final_amount: true,
          expired_at: true,
          items: {
            select: {
              product_id: true,
              product_name: true,
              product_price: true,
              product_type: true,
            },
          },
          user: {
            select: {
              fullname: true,
              email: true,
              phone_number: true,
            },
          },
        },
      }),
      this.prisma.transaction.findFirst({
        where: {
          request_id: body.idempotency_key,
        },
      }),
    ]);

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    if (transaction) {
      return transaction;
    }

    const expired_date = new Date(order.expired_at);

    const now = new Date();

    const invoice_duration = Math.floor(
      (expired_date.getTime() - now.getTime()) / 1000,
    );

    if (invoice_duration < 1) {
      throw new RequestTimeoutException('Order expired');
    }

    const split_name = order.user.fullname.trim().split(' ');

    const raw_payload = {
      external_id: order.invoice_number,
      amount: order.final_amount,
      description: 'Invoice Kelas Masuk Apoteker Mamang Fajar',
      customer: {
        given_names: split_name[0],
        surname: split_name[split_name.length - 1],
        email: decryptString(order.user.email, process.env.ENCRYPT_KEY),
        mobile_number: toE164(
          decryptString(order.user.phone_number, process.env.ENCRYPT_KEY),
        ),
      },
      customer_notification_preference: {
        invoice_created: ['whatsapp', 'email'],
        invoice_reminder: ['whatsapp', 'email'],
        invoice_paid: ['whatsapp', 'email'],
      },
      invoice_duration,
      success_redirect_url: `https://${process.env.MODE === 'prod' ? '' : 'devmain.'}ruangobat.id/checkout/${order.order_id}/success`,
      failure_redirect_url: `https://${process.env.MODE === 'prod' ? '' : 'devmain.'}ruangobat.id/checkout/${order.order_id}/failed`,
      payment_methods: ['BCA', 'BNI', 'BSI', 'BRI', 'MANDIRI', 'QRIS'],
      reminder_time_unit: 'hours',
      reminder_time: '6',
      currency: 'IDR',
      locale: 'id',
      metadata: {
        store_branch: 'Jakarta',
      },
    };

    const fetch_promise = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${process.env.XENDIT_API_KEY}:`).toString('base64')}`,
      },
      body: JSON.stringify(raw_payload),
    });

    const response_xendit = await fetch_promise.json();
  }
}
