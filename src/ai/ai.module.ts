import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { StorageService } from 'src/utils/services/storage.service';
import { PrismaService } from '../utils/services/prisma.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiService, PrismaService, StorageService],
})
export class AiModule {}
