import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuccessResponse } from 'src/utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { AdminQuery } from './admin.dto';
import { AdminService } from './admin.service';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('/dashboard')
  @HttpCode(HttpStatus.OK)
  async getDashboard(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getDashboard(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/users')
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.searchUsers(query),
        };
      }
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getUsers(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/users/:user_id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('user_id') user_id: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getUser(user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getSessions(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/programs')
  @HttpCode(HttpStatus.OK)
  async getPrograms(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getProgramsBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getPrograms(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/programs/:program_id')
  @HttpCode(HttpStatus.OK)
  async getProgram(
    @Param('program_id') program_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getProgram(program_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/programs/unfollow/:program_id/:user_id')
  @HttpCode(HttpStatus.OK)
  async unfollowUsers(
    @Param() params: { program_id: string; user_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.unfollowUsers(
          params.program_id,
          params.user_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }
}
