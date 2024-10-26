import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from 'src/utils/global/global.response';
import { ZodValidationPipe } from 'src/utils/pipes/zod.pipe';
import { UserGuard } from '../utils/guards/user.guard';
import { UserUpdateDto, userUpdateSchema } from './my.dto';
import { MyService } from './my.service';

@Controller('my')
@UseGuards(UserGuard)
export class MyController {
  constructor(private readonly myService: MyService) {}

  @Get('/profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.myService.getProfile(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/profile')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(userUpdateSchema))
  async updateProfile(
    @Req() req: Request,
    @Body() body: UserUpdateDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.myService.updateProfile(req.user.user_id, body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/programs')
  @HttpCode(HttpStatus.OK)
  async getPrograms(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.myService.getPrograms(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/tests')
  @HttpCode(HttpStatus.OK)
  async getTests(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.myService.getTests(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
