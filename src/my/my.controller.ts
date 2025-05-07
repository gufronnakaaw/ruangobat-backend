import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  UserUpdateDto,
  userUpdateSchema,
  UserVerifyEmailDto,
  userVerifyEmailSchema,
} from './my.dto';
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

  @Post('/email/verify')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userVerifyEmailSchema))
  async verifyEmail(
    @Req() req: Request,
    @Body() body: UserVerifyEmailDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.myService.verifyEmail(req.user.user_id, body.otp_code),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/email/otp')
  @HttpCode(HttpStatus.CREATED)
  async sendEmailOtp(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.myService.sendEmailOtp(req.user.user_id),
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
