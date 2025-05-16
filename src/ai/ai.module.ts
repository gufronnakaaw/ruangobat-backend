import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [HttpModule],
  controllers: [AiController],
  providers: [AiService, PrismaService],
})
export class AiModule {}
