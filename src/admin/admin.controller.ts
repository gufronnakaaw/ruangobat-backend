import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
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
import { ClassMentorType } from '@prisma/client';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  AdminQuery,
  ApprovedUserDto,
  approvedUserSchema,
  classMentorSchema,
  CreateClassMentorDto,
  CreateMentorDto,
  createMentorSchema,
  CreateProductSharedDto,
  createProductSharedSchema,
  CreateProgramsDto,
  createProgramsSchema,
  CreateSubjectPrivateDto,
  createSubjectPrivateSchema,
  CreateTestsDto,
  createTestsSchema,
  InviteUsersDto,
  inviteUsersSchema,
  UpdateMentorDto,
  updateMentorSchema,
  UpdateProductSharedDto,
  updateProductSharedSchema,
  UpdateProgramsDto,
  updateProgramsSchema,
  UpdateStatusProgramsDto,
  updateStatusProgramsSchema,
  UpdateStatusTestsDto,
  updateStatusTestsSchema,
  UpdateSubjectPrivateDto,
  updateSubjectPrivateSchema,
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
          data: await this.adminService.getUsersBySearch(query, req.admin.role),
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
    FileInterceptor('qr_code'),
    new InputInterceptor(createProgramsSchema),
  )
  async createPrograms(
    @Body() body: CreateProgramsDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    qr_code: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createProgram(body, qr_code),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/programs')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('qr_code'),
    new InputInterceptor(updateProgramsSchema),
  )
  async updatePrograms(
    @Body() body: UpdateProgramsDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    qr_code: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateProgram(body, qr_code),
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

  @Delete('/programs/:program_id')
  @HttpCode(HttpStatus.OK)
  async deleteProgram(
    @Param('program_id') program_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteProgram(program_id),
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
        data: await this.adminService.createTest(body),
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
        data: await this.adminService.updateTest(body),
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
        data: await this.adminService.updateStatusTest(body),
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
          data: await this.adminService.getFeedbacksBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getFeedbacks(query),
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

  @Get('/exports/users')
  @HttpCode(HttpStatus.OK)
  async exportUsers(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getExportUsersData(req.admin.role),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/exports/codes/:program_id')
  @HttpCode(HttpStatus.OK)
  async exportProgramCodes(
    @Param('program_id') program_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getExportProgramCodesData(program_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/columns/:type')
  @HttpCode(HttpStatus.OK)
  async getColumns(@Param('type') type: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getColumns(type),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/mentors')
  @HttpCode(HttpStatus.OK)
  async getMentors(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getMentorsBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getMentors(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/mentors/:mentor_id')
  @HttpCode(HttpStatus.OK)
  async getMentor(
    @Param('mentor_id') mentor_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getMentor(mentor_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/mentors')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('img_mentor'),
    new InputInterceptor(createMentorSchema),
  )
  async createMentor(
    @Body() body: CreateMentorDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    img_mentor: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createMentor(body, img_mentor),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/mentors')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('img_mentor'),
    new InputInterceptor(updateMentorSchema),
  )
  async updateMentor(
    @Body() body: UpdateMentorDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    img_mentor: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateMentor(body, img_mentor),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/mentors/:mentor_id')
  @HttpCode(HttpStatus.OK)
  async deleteMentor(
    @Param('mentor_id') mentor_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteMentor(mentor_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/subjects/private')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createSubjectPrivateSchema))
  async createSubjectPrivate(
    @Body() body: CreateSubjectPrivateDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createSubjectPrivate(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/subjects/private')
  @HttpCode(HttpStatus.OK)
  async getSubjectPrivate(
    @Query() query: AdminQuery,
  ): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getSubjectPrivateBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getSubjectPrivate(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/subjects/private/:subject_id')
  @HttpCode(HttpStatus.OK)
  async getSubjectPrivateById(
    @Param('subject_id') subject_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getSubjectPrivateById(subject_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/subjects/private')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateSubjectPrivateSchema))
  async updateSubjectPrivate(
    @Body() body: UpdateSubjectPrivateDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateSubjectPrivate(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/subjects/private/:subject_id')
  @HttpCode(HttpStatus.OK)
  async deleteSubjectPrivate(
    @Param('subject_id') subject_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteSubjectPrivate(subject_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/subjects/private/parts/:subject_id/:subject_part_id')
  @HttpCode(HttpStatus.OK)
  async deleteSubjectPartPrivate(
    @Param()
    {
      subject_id,
      subject_part_id,
    }: {
      subject_id: string;
      subject_part_id: string;
    },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteSubjectPartPrivate(
          subject_id,
          subject_part_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/theses')
  @HttpCode(HttpStatus.OK)
  async getTheses(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getThesesBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getTheses(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/theses/:thesis_id')
  @HttpCode(HttpStatus.OK)
  async getThesesById(
    @Param('thesis_id') thesis_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getThesesById(thesis_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/theses')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('thumbnail_theses'),
    new InputInterceptor(createProductSharedSchema),
  )
  async createTheses(
    @Body() body: CreateProductSharedDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    thumbnail_theses: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createTheses(body, thumbnail_theses),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/theses')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('thumbnail_theses'),
    new InputInterceptor(updateProductSharedSchema),
  )
  async updateTheses(
    @Body() body: UpdateProductSharedDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    thumbnail_theses: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateTheses(body, thumbnail_theses),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/theses/:thesis_id')
  @HttpCode(HttpStatus.OK)
  async deleteTheses(
    @Param('thesis_id') thesis_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteTheses(thesis_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/research')
  @HttpCode(HttpStatus.OK)
  async getResearch(@Query() query: AdminQuery): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.adminService.getResearchBySearch(query),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getResearch(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/research/:research_id')
  @HttpCode(HttpStatus.OK)
  async getResearchById(
    @Param('research_id') research_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getResearchById(research_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/research')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('thumbnail_research'),
    new InputInterceptor(createProductSharedSchema),
  )
  async createResearch(
    @Body() body: CreateProductSharedDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    thumbnail_research: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createResearch(body, thumbnail_research),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/research')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('thumbnail_research'),
    new InputInterceptor(updateProductSharedSchema),
  )
  async updateResearch(
    @Body() body: UpdateProductSharedDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    thumbnail_research: Express.Multer.File,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.updateResearch(body, thumbnail_research),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/research/:research_id')
  @HttpCode(HttpStatus.OK)
  async deleteResearch(
    @Param('research_id') research_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteResearch(research_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/classmentor/:type')
  @HttpCode(HttpStatus.OK)
  async getClassMentor(
    @Param('type') type: ClassMentorType,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.getClassMentor(type),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/classmentor')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(classMentorSchema))
  async createClassMentor(
    @Body() body: CreateClassMentorDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.adminService.createClassMentor(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/classmentor/:class_mentor_id')
  @HttpCode(HttpStatus.OK)
  async deleteClassMentor(
    @Param('class_mentor_id') class_mentor_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.adminService.deleteClassMentor(class_mentor_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
