import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AiQuery } from '../ai/ai.dto';
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

  @Get('/ai/limits/ever-reached')
  @HttpCode(HttpStatus.OK)
  async getAllUsersEverReachedLimit(
    @Query() query: AiQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getAllUsersEverReachedLimit(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/ai/limits/today-reached')
  @HttpCode(HttpStatus.OK)
  async getUsersReachedLimitToday(
    @Query('timezone') timezone: string,
    @Query() query: AiQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getUsersReachedLimitToday(
          query,
          timezone,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/ai/chats/today')
  @HttpCode(HttpStatus.OK)
  async getAllChatUsersToday(
    @Query('timezone') timezone: string,
    @Query() query: AiQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getAllChatUsersToday(
          query,
          timezone,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/ai/users/costs')
  @HttpCode(HttpStatus.OK)
  async getAllUsersWithTotalCost(
    @Query() query: AiQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.statisticsService.getAllUsersWithTotalCost(query),
      };
    } catch (error) {
      throw error;
    }
  }
}
