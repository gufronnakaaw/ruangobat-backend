import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, PrismaService],
})
export class ActivitiesModule {}
