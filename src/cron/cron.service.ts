import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class CronService {
  constructor(
    private prisma: PrismaService,
    private http: HttpService,
  ) {}

  // @Cron(CronExpression.EVERY_5_MINUTES)
  // async handleDeleteSession() {
  //   try {
  //     const date = new Date();
  //     await this.prisma.session.deleteMany({
  //       where: {
  //         expired: {
  //           lte: date,
  //         },
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    timeZone: 'Asia/Jakarta',
  })
  async handleDeleteOtp() {
    try {
      const date = new Date();
      await this.prisma.otp.deleteMany({
        where: {
          expired_at: {
            lte: date,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Jakarta',
  })
  async handleAccessExpiration() {
    try {
      const date = new Date();
      await this.prisma.access.updateMany({
        where: {
          expired_at: {
            lte: date,
          },
          status: 'active',
          is_active: true,
        },
        data: {
          is_active: false,
          status: 'expired',
        },
      });

      const formatted_json = JSON.stringify({
        message: 'cron job subscription executed successfully ✅',
        env: process.env.MODE.toUpperCase(),
      });

      await firstValueFrom(
        this.http.post(process.env.TELEGRAM_URL, {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `\`\`\`json\n${formatted_json}\n\`\`\``,
          parse_mode: 'Markdown',
        }),
      );
    } catch (error) {
      const formatted_json = JSON.stringify({
        message: 'cron job subscription failed to execute ❌',
        error: error.message,
        env: process.env.MODE.toUpperCase(),
      });

      await firstValueFrom(
        this.http.post(process.env.TELEGRAM_URL, {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `\`\`\`json\n${formatted_json}\n\`\`\``,
          parse_mode: 'Markdown',
        }),
      );
    }
  }
}
