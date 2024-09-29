import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  controllers: [ProgramsController],
  providers: [ProgramsService, PrismaService],
})
export class ProgramsModule {}
