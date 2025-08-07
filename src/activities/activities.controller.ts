import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  ActivitiesQuery,
  CreateProductLogDto,
  createProductLogSchema,
} from './activities.dto';
import { ActivitiesService } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @UseGuards(AdminGuard)
  @Get('products/:type')
  async getProductLogs(
    @Query() query: ActivitiesQuery,
    @Param('type') type: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.activitiesService.getProductLogs(type, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createProductLogSchema))
  async createProductLog(
    @Body() body: CreateProductLogDto,
  ): Promise<SuccessResponse> {
    try {
      await this.activitiesService.createProductLog(body);
      return {
        success: true,
        status_code: HttpStatus.CREATED,
      };
    } catch (error) {
      throw error;
    }
  }
}
