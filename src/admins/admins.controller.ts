import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from 'src/utils/global/global.response';
import { ZodValidationPipe } from 'src/utils/pipes/zod.pipe';
import { SuperAdminGuard } from '../utils/guards/superadmin.guard';
import { UpdateAdminsDto, updateAdminsSchema } from './admins.dto';
import { AdminsService } from './admins.service';

@Controller('admins')
@UseGuards(SuperAdminGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAdmins(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminsService.getAdmins(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':admin_id')
  @HttpCode(HttpStatus.OK)
  async getAdmin(
    @Param('admin_id') admin_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminsService.getAdmin(admin_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':admin_id')
  @HttpCode(HttpStatus.OK)
  async deleteAdmins(
    @Param('admin_id') admin_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminsService.deleteAdmin(admin_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateAdminsSchema))
  async updatePrograms(
    @Body() body: UpdateAdminsDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminsService.updateAdmin(body),
      };
    } catch (error) {
      throw error;
    }
  }
}
