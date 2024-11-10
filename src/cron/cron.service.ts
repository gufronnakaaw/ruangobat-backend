import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../utils/services/prisma.service';

@Injectable()
export class CronService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleDeleteSession() {
    try {
      const date = new Date();
      await this.prisma.session.deleteMany({
        where: {
          expired: {
            lte: date,
          },
        },
      });
    } catch (error) {
      console.log(error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
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
}
