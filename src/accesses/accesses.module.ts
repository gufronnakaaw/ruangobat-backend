import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { AccessesController } from './accesses.controller';
import { AccessesService } from './accesses.service';

@Module({
  controllers: [AccessesController],
  providers: [AccessesService, PrismaService],
})
export class AccessesModule {}
