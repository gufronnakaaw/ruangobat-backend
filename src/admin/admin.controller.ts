import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { diskStorage } from 'multer';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AdminQuery,
  ApprovedUserDto,
  approvedUserSchema,
  CreateProgramsDto,
  CreateTestsDto,
  createTestsSchema,
  InviteUsersDto,
  inviteUsersSchema,
  UpdateProgramsDto,
  UpdateStatusProgramsDto,
  updateStatusProgramsSchema,
  UpdateStatusTestsDto,
  updateStatusTestsSchema,
  UpdateTestsDto,
  updateTestsSchema,
  UpdateUserDto,
  updateUserSchema,
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
  async getUsers(
    @Query() query: AdminQuery,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      if (query.page == 'all') {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getAllUsers(),
        };
      }

      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.searchUsers(query, req.admin.role),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getUsers(query, req.admin.role),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/users/:user_id')
  @HttpCode(HttpStatus.OK)
  async getUser(
    @Param('user_id') user_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getUser(user_id, req.admin.role),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getSessionsBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getSessions(query),
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
  @UseInterceptors(
    FileInterceptor('qr_code', {
      storage: diskStorage({
        destination: './public/qr',
        filename(req, file, callback) {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter(req, file, callback) {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Hanya gambar yang diperbolehkan'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async createPrograms(
    @Body() body: CreateProgramsDto,
    @UploadedFile() qr_code: Express.Multer.File,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createPrograms(
          body,
          qr_code,
          req.fullurl,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/programs')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('qr_code', {
      storage: diskStorage({
        destination: './public/qr',
        filename(req, file, callback) {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter(req, file, callback) {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Hanya gambar yang diperbolehkan'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024,
      },
    }),
  )
  async updatePrograms(
    @Body() body: UpdateProgramsDto,
    @UploadedFile() qr_code: Express.Multer.File,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updatePrograms(
          body,
          qr_code,
          req.fullurl,
        ),
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
    @Query() query: AdminQuery,
  ): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getProgramParticipantsBySearch(
            program_id,
            query,
          ),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getProgram(program_id, query),
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

  @Get('/programs/:program_id/images/:user_id')
  @HttpCode(HttpStatus.OK)
  async getUsersImages(
    @Param() params: { program_id: string; user_id: string },
  ) {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getUsersImages(params),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/programs/approved')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(approvedUserSchema))
  async approvedUser(@Body() body: ApprovedUserDto) {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.approvedUser(body),
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

  @Get('/tests')
  @HttpCode(HttpStatus.OK)
  async getTests(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.page == 'all') {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getAllTests(),
        };
      }

      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getTestsBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getTests(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/tests/:test_id')
  @HttpCode(HttpStatus.OK)
  async getTest(
    @Param('test_id') test_id: string,
    @Query() query: AdminQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getTest(test_id, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/tests')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateTestsSchema))
  async updateTests(@Body() body: UpdateTestsDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateTests(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/tests/:test_id/questions/:question_id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(
    @Param() param: { test_id: string; question_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteQuestion(param),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/tests/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateStatusTestsSchema))
  async updateStatusTests(
    @Body() body: UpdateStatusTestsDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateStatusTests(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/tests/results/:test_id')
  @HttpCode(HttpStatus.OK)
  async getResultsTest(
    @Param('test_id') test_id: string,
    @Query() query: AdminQuery,
  ) {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getResultsTestBySearch(test_id, query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getResultsTest(test_id, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/feedback')
  @HttpCode(HttpStatus.OK)
  async getFeedback(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getFeedbackBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getFeedback(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/results/:result_id')
  @HttpCode(HttpStatus.OK)
  async getResult(
    @Param('result_id') result_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getResult(result_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/results/:result_id')
  @HttpCode(HttpStatus.OK)
  async deleteResult(
    @Param('result_id') result_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteResult(result_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/users')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  async updateUser(@Body() body: UpdateUserDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateUser(body),
      };
    } catch (error) {
      throw error;
    }
  }
}
