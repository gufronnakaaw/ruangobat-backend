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
  AdminQuery,
  CreateProgramsDto,
  createProgramsSchema,
  CreateTestsDto,
  createTestsSchema,
  InviteUsersDto,
  inviteUsersSchema,
  UpdateProgramsDto,
  updateProgramsSchema,
  UpdateStatusProgramsDto,
  updateStatusProgramsSchema,
} from './admin.dto';
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

  @Post('/programs')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createProgramsSchema))
  async createPrograms(
    @Body() body: CreateProgramsDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createPrograms(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/programs')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateProgramsSchema))
  async updatePrograms(
    @Body() body: UpdateProgramsDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updatePrograms(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/programs/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateStatusProgramsSchema))
  async updateStatusProgram(
    @Body() body: UpdateStatusProgramsDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateStatusProgram(body),
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

  @Post('/programs/invite')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(inviteUsersSchema))
  async inviteUsers(@Body() body: InviteUsersDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.inviteUsers(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/tests')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTestsSchema))
  async createTests(@Body() body: CreateTestsDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createTests(body),
      };
    } catch (error) {
      throw error;
    }
  }
}
