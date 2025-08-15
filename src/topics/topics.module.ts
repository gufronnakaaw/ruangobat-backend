import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  controllers: [TopicsController],
  providers: [TopicsService, PrismaService],
})
export class TopicsModule {}
