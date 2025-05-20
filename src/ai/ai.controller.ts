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
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { UserGuard } from 'src/utils/guards/user.guard';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AiQuery,
  createAiLimit,
  CreateAiLimitDto,
  CreateContextDto,
  createContextSchema,
  CreateProviderDto,
  createProviderSchema,
  createUserAiLimit,
  CreateUserAiLimitDto,
  updateAiLimit,
  UpdateAiLimitDto,
  UpdateContextDto,
  updateContextSchema,
  UpdateProviderDto,
  updateProviderSchema,
  updateUserAiLimit,
  UpdateUserAiLimitDto,
} from './ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(AdminGuard)
  @Get('/providers')
  @HttpCode(HttpStatus.OK)
  async getProviders(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getProviders(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/providers/:provider_id')
  @HttpCode(HttpStatus.OK)
  async getProvider(
    @Param('provider_id') provider_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getProvider(provider_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/providers')
  @UsePipes(new ZodValidationPipe(createProviderSchema))
  @HttpCode(HttpStatus.CREATED)
  async createProvider(
    @Body() body: CreateProviderDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createProvider(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/providers')
  @UsePipes(new ZodValidationPipe(updateProviderSchema))
  @HttpCode(HttpStatus.OK)
  async updateProvider(
    @Body() body: UpdateProviderDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateProvider(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/providers/:provider_id')
  @HttpCode(HttpStatus.OK)
  async deleteProvider(
    @Param('provider_id') provider_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteProvider(provider_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/contexts')
  @HttpCode(HttpStatus.OK)
  async getContexts(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService[
          query.q ? 'getContextsBySearch' : 'getContexts'
        ](query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/contexts/:context_id')
  @HttpCode(HttpStatus.OK)
  async getContext(
    @Param('context_id') context_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getContext(context_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/contexts')
  @UsePipes(new ZodValidationPipe(createContextSchema))
  @HttpCode(HttpStatus.CREATED)
  async createContext(
    @Body() body: CreateContextDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createContext(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/contexts')
  @UsePipes(new ZodValidationPipe(updateContextSchema))
  @HttpCode(HttpStatus.OK)
  async updateContext(
    @Body() body: UpdateContextDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateContext(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/contexts/:context_id')
  @HttpCode(HttpStatus.OK)
  async deleteContext(
    @Param('context_id') context_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteContext(context_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/chat')
  @HttpCode(HttpStatus.OK)
  async getChat(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getChat(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/chat')
  @HttpCode(HttpStatus.CREATED)
  async chatCompletion(
    @Body() body: { input: string },
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.chatCompletion(req.user.user_id, body.input),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/chat/logs')
  @HttpCode(HttpStatus.OK)
  async getChatLogs(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService[
          query.q ? 'getChatLogsBySearch' : 'getChatLogs'
        ](query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/limits/check')
  @HttpCode(HttpStatus.OK)
  async checkLimitUser(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.checkLimitUser(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/limits')
  @HttpCode(HttpStatus.OK)
  async getAiLimits(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getAiLimits(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/limits')
  @UsePipes(new ZodValidationPipe(createAiLimit))
  @HttpCode(HttpStatus.CREATED)
  async createAiLimit(
    @Body() body: CreateAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/limits')
  @UsePipes(new ZodValidationPipe(updateAiLimit))
  @HttpCode(HttpStatus.OK)
  async updateAiLimit(
    @Body() body: UpdateAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/limits/:limit_id')
  @HttpCode(HttpStatus.OK)
  async deleteAiLimit(
    @Param('limit_id') limit_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteAiLimit(limit_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/limits/users')
  @HttpCode(HttpStatus.OK)
  async getAiLimitUsers(@Query() query: AiQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService[
          query.q ? 'getAiLimitUsersBySearch' : 'getAiLimitUsers'
        ](query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/limits/users')
  @UsePipes(new ZodValidationPipe(createUserAiLimit))
  @HttpCode(HttpStatus.CREATED)
  async createUserAiLimit(
    @Body() body: CreateUserAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.aiService.createUserAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/limits/users')
  @UsePipes(new ZodValidationPipe(updateUserAiLimit))
  @HttpCode(HttpStatus.OK)
  async updateUserAiLimit(
    @Body() body: UpdateUserAiLimitDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.updateUserAiLimit(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/limits/users/:user_id')
  @HttpCode(HttpStatus.OK)
  async deleteUserAiLimit(
    @Param('user_id') user_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.deleteUserAiLimit(user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
