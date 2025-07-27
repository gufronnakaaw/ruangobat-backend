import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService],
})
export class SubscriptionsModule {}
