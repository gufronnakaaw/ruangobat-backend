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
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AiQuery,
  CreateContextDto,
  createContextSchema,
  CreateProviderDto,
  createProviderSchema,
  UpdateContextDto,
  updateContextSchema,
  UpdateProviderDto,
  updateProviderSchema,
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
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.aiService.getContextsBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.aiService.getContexts(query),
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
}
