import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { MyController } from './my.controller';
import { MyService } from './my.service';

@Module({
  controllers: [MyController],
  providers: [MyService, PrismaService],
})
export class MyModule {}
