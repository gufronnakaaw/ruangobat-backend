import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  controllers: [BatchesController],
  providers: [BatchesService, PrismaService, StorageService],
})
export class BatchesModule {}
