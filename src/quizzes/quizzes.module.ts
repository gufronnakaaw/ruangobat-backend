import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { QuizzesController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

@Module({
  controllers: [QuizzesController],
  providers: [QuizzesService, PrismaService],
})
export class QuizzesModule {}
