import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import { CreateBatchUsersDto, createBatchUsersSchema } from './batches.dto';
import { BatchesService } from './batches.service';

@Controller('batches')
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @UseGuards(AdminGuard)
  @Post('/users')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createBatchUsersSchema))
  async createBulkUsers(
    @Body() body: CreateBatchUsersDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.batchesService.createBulkUsers(body),
      };
    } catch (error) {
      throw error;
    }
  }
}
