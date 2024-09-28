import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { UsersQuery } from './users.dto';
import { UsersService } from './users.service';

@UseGuards(AdminGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUsers(@Query() query: UsersQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.usersService.searchUsers(query),
        };
      }
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.usersService.getUsers(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':user_id')
  @HttpCode(HttpStatus.OK)
  async getUser(@Param('user_id') user_id: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.usersService.getUser(user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
