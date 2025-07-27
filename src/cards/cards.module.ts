import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
  controllers: [CardsController],
  providers: [CardsService, PrismaService, StorageService],
})
export class CardsModule {}
