import { HttpService } from '@nestjs/axios';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AxiosResponse } from 'axios';
import { firstValueFrom, Observable } from 'rxjs';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class CronService {
  constructor(
    private prisma: PrismaService,
    private http: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

      await Promise.all([
        this.prisma.otp.deleteMany({
          where: {
            expired_at: {
              lte: date,
            },
          },
        }),
        this.prisma.start.deleteMany({
          where: {
            end_time: {
              lte: date,
            },
          },
        }),
      ]);
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

      const formatted_json = JSON.stringify(
        {
          message: 'cron job subscription executed successfully ✅',
          env: process.env.MODE.toUpperCase(),
        },
        null,
        2,
      );

      await firstValueFrom(
        this.http.post(process.env.TELEGRAM_URL, {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `\`\`\`json\n${formatted_json}\n\`\`\``,
          parse_mode: 'Markdown',
        }),
      );
    } catch (error) {
      const formatted_json = JSON.stringify(
        {
          message: 'cron job subscription failed to execute ❌',
          error: error.message,
          env: process.env.MODE.toUpperCase(),
        },
        null,
        2,
      );

      await firstValueFrom(
        this.http.post(process.env.TELEGRAM_URL, {
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `\`\`\`json\n${formatted_json}\n\`\`\``,
          parse_mode: 'Markdown',
        }),
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE, {
    timeZone: 'Asia/Jakarta',
  })
  async handleUpdateArticleViews() {
    try {
      const keys = await this.cacheManager.store.keys();
      const now = Date.now();
      let updatedCount = 0;

      for (const key of keys) {
        if (key.startsWith('article:') && key.endsWith(':views')) {
          try {
            const cacheData = await this.cacheManager.get<{
              count: number;
              lastUpdate: number;
            }>(key);

            if (!cacheData || cacheData.count <= 0) continue;

            const timeElapsed = now - cacheData.lastUpdate;

            const shouldProcess = timeElapsed > 30000 || timeElapsed > 150000;

            if (shouldProcess) {
              const article_id = key.split(':')[1];

              await this.prisma.article.update({
                where: { article_id },
                data: { views: { increment: cacheData.count } },
              });

              await this.cacheManager.del(key);
              updatedCount++;
            }
          } catch (keyError) {
            console.error(`Failed to process key ${key}:`, keyError);
          }
        }
      }

      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} article views`);
      }
    } catch (error) {
      console.error('Article views cron job failed:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR, {
    timeZone: 'Asia/Jakarta',
  })
  async handleCheckBalance() {
    if (process.env.MODE === 'prod') {
      try {
        const [rates, credits] = await Promise.all([
          firstValueFrom(
            this.http.get(
              'https://open.er-api.com/v6/latest/usd',
            ) as Observable<AxiosResponse<{ rates: { IDR: number } }>>,
          ),
          firstValueFrom(
            this.http.get(`${process.env.PROVIDER_URL}/api/v1/credits`, {
              headers: {
                Authorization: `Bearer ${process.env.PROVIDER_CREDIT_KEY}`,
              },
            }) as Observable<
              AxiosResponse<{
                data: { total_credits: number; total_usage: number };
              }>
            >,
          ),
        ]);

        const idr = Math.round(
          (credits.data.data.total_credits - credits.data.data.total_usage) *
            rates.data.rates.IDR,
        );

        if (idr <= 20_000) {
          const data = {
            remaining_credits:
              credits.data.data.total_credits - credits.data.data.total_usage,
            usd_to_idr_rate: new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
            }).format(Math.round(rates.data.rates.IDR)),
            total_balance_idr: new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
            }).format(idr),
            checked_at: new Date().toLocaleDateString('id-ID', {
              timeZone: 'Asia/Jakarta',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          };

          const formatted_json = JSON.stringify(
            {
              message: 'cron job check balance executed successfully ✅',
              env: process.env.MODE.toUpperCase(),
              ...data,
            },
            null,
            2,
          );

          await firstValueFrom(
            this.http.post(process.env.TELEGRAM_URL, {
              chat_id: process.env.TELEGRAM_CHAT_ID,
              text: `\`\`\`json\n${formatted_json}\n\`\`\``,
              parse_mode: 'Markdown',
            }),
          );
        }
      } catch (error) {
        const formatted_json = JSON.stringify(
          {
            message: 'cron job check balance failed to execute ❌',
            error: error.message,
            env: process.env.MODE.toUpperCase(),
          },
          null,
          2,
        );

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
}
