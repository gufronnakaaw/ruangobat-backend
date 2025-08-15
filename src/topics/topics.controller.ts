import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import {
  CreateTopicDto,
  createTopicSchema,
  TopicQuery,
  UpdateTopicDto,
  updateTopicSchema,
} from './topics.dto';
import { TopicsService } from './topics.service';

@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get('/all')
  @HttpCode(HttpStatus.OK)
  async getAllTopics(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.topicsService.getAllTopics(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(new InputInterceptor(createTopicSchema))
  async createTopic(
    @Body() body: CreateTopicDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.topicsService.createTopic(body, req.admin.fullname),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get()
  @HttpCode(HttpStatus.OK)
  async getTopics(@Query() query: TopicQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.topicsService.getTopicsFiltered(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(new InputInterceptor(updateTopicSchema))
  async updateTopic(
    @Body() body: UpdateTopicDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.topicsService.updateTopic(body, req.admin.fullname),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':topic_id')
  @HttpCode(HttpStatus.OK)
  async deleteTopic(
    @Param('topic_id') topic_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.topicsService.deleteTopic(topic_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
