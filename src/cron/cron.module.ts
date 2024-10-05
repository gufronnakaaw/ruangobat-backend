import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { CronService } from './cron.service';

@Module({
  providers: [CronService, PrismaService],
})
export class CronModule {}
