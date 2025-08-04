import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { CronService } from './cron.service';

@Module({
  imports: [HttpModule],
  providers: [CronService, PrismaService],
})
export class CronModule {}
