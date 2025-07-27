import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PrismaService } from '../utils/services/prisma.service';
import { StorageService } from '../utils/services/storage.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [HttpModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService, StorageService],
})
export class AdminModule {}
