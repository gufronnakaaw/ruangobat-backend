import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { SuperAdminGuard } from '../utils/guards/superadmin.guard';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AdminLoginDto,
  adminLoginSchema,
  AdminRegisterDto,
  adminRegisterSchema,
  UserLoginDto,
  userLoginSchema,
  UserRegisterDto,
  userRegisterSchema,
} from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(SuperAdminGuard)
  @Post('/register/admins')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(adminRegisterSchema))
  async adminsRegister(
    @Body() body: AdminRegisterDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.authService.adminRegister(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/login/admins')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(adminLoginSchema))
  async adminsLogin(@Body() body: AdminLoginDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.authService.adminLogin(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/register/users')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(userRegisterSchema))
  async usersRegister(@Body() body: UserRegisterDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.authService.userRegister(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/login/users')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(userLoginSchema))
  async usersLogin(
    @Body() body: UserLoginDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.authService.userLogin(body, req.headers['user-agent']),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/session/check')
  @HttpCode(HttpStatus.OK)
  async checkSession(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.authService.checkSession(req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/session/:user_id')
  @HttpCode(HttpStatus.OK)
  async userLogout(
    @Param('user_id') user_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.authService.userLogout(user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/session/:user_id')
  @HttpCode(HttpStatus.OK)
  async destroySession(
    @Param('user_id') user_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.authService.userLogout(user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
