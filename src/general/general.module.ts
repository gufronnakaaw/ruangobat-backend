import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { GeneralController } from './general.controller';
import { GeneralService } from './general.service';

@Module({
  controllers: [GeneralController],
  providers: [GeneralService, PrismaService],
})
export class GeneralModule {}
