import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { AdminsController } from './admins.controller';
import { AdminsService } from './admins.service';

@Module({
  controllers: [AdminsController],
  providers: [AdminsService, PrismaService],
})
export class AdminsModule {}
