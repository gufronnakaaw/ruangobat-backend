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
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AccessesQuery,
  CreateAccessDto,
  createAccessSchema,
  RevokeAccessDto,
  revokeAccessSchema,
  TypeAccess,
  UpdatePlanDto,
  updatePlanSchema,
  UpsertTestsDto,
  upsertTestsSchema,
  uuidSchema,
} from './accesses.dto';
import { AccessesService } from './accesses.service';

@UseGuards(AdminGuard)
@Controller('accesses')
export class AccessesController {
  constructor(private readonly accessesService: AccessesService) {}

  @Get(':access_id/detail')
  @HttpCode(HttpStatus.OK)
  async getAccessDetail(
    @Param('access_id', new ZodValidationPipe(uuidSchema)) access_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.accessesService.getAccessDetail(access_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':type')
  @HttpCode(HttpStatus.OK)
  async getAccessList(
    @Param('type', new ZodValidationPipe(TypeAccess))
    type: typeof TypeAccess._type,
    @Query() query: AccessesQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.accessesService.getAccessList(type, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAccess(
    @Body(new ZodValidationPipe(createAccessSchema))
    body: CreateAccessDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.accessesService.createAccess(body, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('plan')
  @HttpCode(HttpStatus.CREATED)
  async updatePlan(
    @Body(new ZodValidationPipe(updatePlanSchema))
    body: UpdatePlanDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.accessesService.updatePlan(body, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('tests')
  @HttpCode(HttpStatus.CREATED)
  async createAccessTest(
    @Body(new ZodValidationPipe(upsertTestsSchema))
    body: UpsertTestsDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.accessesService.createAccessTest(body, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('tests/:access_test_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccessTest(
    @Param('access_test_id', new ZodValidationPipe(uuidSchema))
    access_test_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.NO_CONTENT,
        data: await this.accessesService.deleteAccessTest(access_test_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('revoke')
  @HttpCode(HttpStatus.CREATED)
  async revokeAccess(
    @Body(new ZodValidationPipe(revokeAccessSchema))
    body: RevokeAccessDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.accessesService.revokeAccess(body, req),
      };
    } catch (error) {
      throw error;
    }
  }
}
