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
  CreateSubscriptionPackageDto,
  createSubscriptionPackageSchema,
  SubscriptionsQuery,
  UpdateSubscriptionPackageDto,
  updateSubscriptionPackageSchema,
} from './subscriptions.dto';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(AdminGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('/packages')
  @HttpCode(HttpStatus.OK)
  async getPackages(
    @Query() query: SubscriptionsQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.subscriptionsService.getPackages(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/packages/:package_id')
  @HttpCode(HttpStatus.OK)
  async getPackage(
    @Param('package_id') package_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.subscriptionsService.getPackage(package_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/packages')
  @UsePipes(new ZodValidationPipe(createSubscriptionPackageSchema))
  @HttpCode(HttpStatus.CREATED)
  async createPackage(
    @Body() body: CreateSubscriptionPackageDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.subscriptionsService.createPackage(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/packages')
  @UsePipes(new ZodValidationPipe(updateSubscriptionPackageSchema))
  @HttpCode(HttpStatus.OK)
  async updatePackage(
    @Body() body: UpdateSubscriptionPackageDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.subscriptionsService.updatePackage(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/packages/:package_id')
  @HttpCode(HttpStatus.OK)
  async deletePackage(
    @Param('package_id') package_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.subscriptionsService.deletePackage(package_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/benefits/:benefit_id')
  @HttpCode(HttpStatus.OK)
  async deleteBenefit(
    @Param('benefit_id') benefit_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.subscriptionsService.deleteBenefit(benefit_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
