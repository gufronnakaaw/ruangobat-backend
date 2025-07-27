import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { StatisticsService } from './statistics.service';

@UseGuards(AdminGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  async getLoginStatistics(
    @Query('timezone') timezone: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getLoginStatistics(timezone),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('registered')
  @HttpCode(HttpStatus.OK)
  async getRegisteredUserStatistics(
    @Query('timezone') timezone: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getRegisteredUserStatistics(
          timezone,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('ai')
  @HttpCode(HttpStatus.OK)
  async getAiUsageStatistics(
    @Query('timezone') timezone: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getAiUsageStatistics(timezone),
      };
    } catch (error) {
      throw error;
    }
  }
}
