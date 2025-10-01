import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController],
  providers: [EventsService, PrismaService],
})
export class EventsModule {}
