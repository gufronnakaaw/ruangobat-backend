import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from 'src/utils/global/global.response';
import { ZodValidationPipe } from 'src/utils/pipes/zod.pipe';
import { CreateBankDto, createBankSchema } from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/banks/:bank_id')
  async indexBank(@Param('bank_id') bank_id: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.getBankById(bank_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/banks')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createBankSchema))
  async storeBank(@Body() body: CreateBankDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.storeBank(body),
      };
    } catch (error) {
      throw error;
    }
  }
}
