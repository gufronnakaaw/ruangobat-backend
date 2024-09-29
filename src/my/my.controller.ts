import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from 'src/utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
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
}
