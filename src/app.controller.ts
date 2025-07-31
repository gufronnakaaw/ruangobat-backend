import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import mammoth from 'mammoth';
import {
  AppQuery,
  CreateFeedbackDto,
  createFeedbackSchema,
  CreateFolderDto,
  createFolderSchema,
  CreateGeneralTestimonialDto,
  createGeneralTestimonialSchema,
  CreateProgressDto,
  createProgressSchema,
  CreateTryoutDto,
  createTryoutSchema,
  CreateUniversityDto,
  createUniversitySchema,
  FinishAssessmentDto,
  finishAssessmentSchema,
  ResetPasswordDto,
  resetPasswordSchema,
  SendEmailDto,
  sendEmailSchema,
  StartAssessmentQuestion,
  UpdateTryoutDto,
  updateTryoutSchema,
  UpdateUniversityDto,
  updateUniversitySchema,
  UploadFilesDto,
  uploadFilesSchema,
  VerifyOtpDto,
  verifyOtpSchema,
} from './app.dto';
import { AppService } from './app.service';
import { SuccessResponse } from './utils/global/global.response';
import { AdminGuard } from './utils/guards/admin.guard';
import { PublicGuard } from './utils/guards/public.guard';
import { UserGuard } from './utils/guards/user.guard';
import { InputInterceptor } from './utils/interceptors/input.interceptor';
import { ZodValidationPipe } from './utils/pipes/zod.pipe';
import { StorageService } from './utils/services/storage.service';

@Controller()
export class AppController {
  constructor(
    private appService: AppService,
    private storage: StorageService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  index(): SuccessResponse {
    return {
      success: true,
      status_code: HttpStatus.OK,
      message: `RuangObat ${process.env.MODE === 'prod' ? 'API' : 'Dev API'}`,
    };
  }

  @UseGuards(UserGuard)
  @Post('/feedback')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createFeedbackSchema))
  async createFeedback(
    @Body() body: CreateFeedbackDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.createFeedback(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/email/forgot')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(sendEmailSchema))
  async sendEmailForgotPassword(
    @Body() body: SendEmailDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.sendForgotPasswordOTP(body.email),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/email/register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(sendEmailSchema))
  async sendEmailRegister(
    @Body() body: SendEmailDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.sendRegistrationOTP(body.email),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/otp/verify')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(verifyOtpSchema))
  async verifyOtp(@Body() body: VerifyOtpDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.verifyOtp(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/reset/password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.resetPassword(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/questions/image')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('upload'))
  async uploadQuestionImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    try {
      return {
        url: await this.storage.uploadFile({
          buffer: file.buffer,
          key: `questions/${Date.now()}-${file.originalname}`,
          mimetype: file.mimetype,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/start/:test_id/:user_id')
  @HttpCode(HttpStatus.OK)
  async deleteResult(
    @Param() params: { test_id: string; user_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.deleteStart(params),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/homepage')
  @HttpCode(HttpStatus.OK)
  async getHomepageData(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getHomepageData(),
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
        data: await this.appService.getMentor(mentor_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/subjects/private')
  @HttpCode(HttpStatus.OK)
  async getSubjectPrivate(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getSubjectPrivate(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/theses')
  @HttpCode(HttpStatus.OK)
  async getTheses(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getTheses(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/research')
  @HttpCode(HttpStatus.OK)
  async getResearch(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getResearch(),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/universities/tryouts')
  @HttpCode(HttpStatus.OK)
  async getTryouts(@Query() query: AppQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getTryouts(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/universities/tryouts/:ass_id')
  @HttpCode(HttpStatus.OK)
  async getTryout(
    @Param('ass_id') ass_id: string,
    @Query() query: AppQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getTryout(ass_id, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/universities/tryouts')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTryoutSchema))
  async createTryout(@Body() body: CreateTryoutDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.createTryout(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('/universities/tryouts')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateTryoutSchema))
  async updateTryout(@Body() body: UpdateTryoutDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.updateTryout(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/universities/tryouts/:ass_id/questions/:assq_id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(
    @Param() params: { ass_id: string; assq_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.deleteTryoutQuestion(params),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/universities')
  @HttpCode(HttpStatus.OK)
  async getUniversities(@Query() query: AppQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getUniversities(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/universities/:id_or_slug')
  @HttpCode(HttpStatus.OK)
  async getUniversity(
    @Param('id_or_slug') id_or_slug: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getUniversity(id_or_slug),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/universities')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('thumbnail'),
    new InputInterceptor(createUniversitySchema),
  )
  async createUniversity(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: CreateUniversityDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.createUniversity(body, file),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch('/universities')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('thumbnail'),
    new InputInterceptor(updateUniversitySchema),
  )
  async updateUniversity(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
    @Body() body: UpdateUniversityDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.updateUniversity(body, file),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/universities/:univd_id/detail')
  @HttpCode(HttpStatus.OK)
  async deleteUniversityDetail(
    @Param('univd_id') univd_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.deleteUniversityDetail(univd_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/apotekerclass')
  @HttpCode(HttpStatus.OK)
  async getApotekerClass(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getApotekerClass(req),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/videocourse')
  @HttpCode(HttpStatus.OK)
  async getVideoCourse(@Req() req: Request): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getVideoCourse(req),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/contents/:cat_or_sub/:type')
  @HttpCode(HttpStatus.OK)
  async getContents(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'apotekerclass' | 'videocourse' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getContents(cat_or_sub, type, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/assessments/:ass_or_content_id/start')
  @HttpCode(HttpStatus.OK)
  async startAssessment(
    @Param('ass_or_content_id') ass_or_content_id: string,
  ): Promise<SuccessResponse> {
    try {
      const cache = (await this.cacheManager.get(
        ass_or_content_id,
      )) as StartAssessmentQuestion[];

      if (cache) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.appService.startAssessment({
            ass_or_content_id,
            questions: cache,
          }),
        };
      }

      const questions =
        await this.appService.getAssessmentQuestions(ass_or_content_id);
      await this.cacheManager.set(ass_or_content_id, questions, 120000);

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.startAssessment({
          ass_or_content_id,
          questions,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/assessments/finish')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(finishAssessmentSchema))
  async finishAssessment(
    @Body() body: FinishAssessmentDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.finishAssessment(body, req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/assessments/:assr_id/result')
  @HttpCode(HttpStatus.OK)
  async getAssessmentResult(
    @Param('assr_id') assr_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getAssessmentResult({
          assr_id,
          user_id: req.user.user_id,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('categories/:id_or_slug/:type/detail')
  @HttpCode(HttpStatus.OK)
  async getCategory(
    @Param('id_or_slug') id_or_slug: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getCategory(id_or_slug, type),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/contents/:slug/:type/detail')
  @HttpCode(HttpStatus.OK)
  async getContent(
    @Param('slug') slug: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getContent(slug, type, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/segments/:course_id/:segment_id')
  @HttpCode(HttpStatus.OK)
  async getSegmentContents(
    @Param('course_id') course_id: string,
    @Param('segment_id') segment_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getSegmentContents(
          course_id,
          segment_id,
          req,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/progress')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createProgressSchema))
  async createProgress(
    @Body() body: CreateProgressDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.createProgress(body, req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/urls/:content_id')
  @HttpCode(HttpStatus.OK)
  async getVideoUrl(
    @Param('content_id') content_id: string,
    @Query('token') token: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getVideoUrl(content_id, token),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Get('/notes/:content_id')
  @HttpCode(HttpStatus.OK)
  async getContentNotes(
    @Param('content_id') content_id: string,
    @Query('token') token: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getContentNotes(content_id, token),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get('/universities/:id_or_slug/detail')
  @HttpCode(HttpStatus.OK)
  async getUniversityDetail(
    @Param('id_or_slug') id_or_slug: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getUniversityDetail(id_or_slug, req),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Get('/storage')
  @HttpCode(HttpStatus.OK)
  async getStorageLists(
    @Query('prefix') prefix: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: {
          ...(await this.storage.getLists(prefix)),
          Endpoint: process.env.STORAGE_ENDPOINT,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete('/storage')
  @HttpCode(HttpStatus.OK)
  async deleteStorageItem(
    @Query('key') key: string,
    @Query('is_folder') is_folder: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.storage[
          is_folder === 'true' ? 'deleteFolder' : 'deleteFile'
        ](key),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/storage/presigned')
  @UsePipes(new ZodValidationPipe(uploadFilesSchema))
  @HttpCode(HttpStatus.OK)
  async getSignedUrl(@Body() body: UploadFilesDto): Promise<SuccessResponse> {
    try {
      const urls: { key: string; url: string }[] = [];

      for (const file of body.files) {
        const key = `${body.folder}${file.filename}`;

        const url = await this.storage.getSignedUrl({
          key,
          type: file.type,
          by: body.by,
        });

        urls.push({ key, url });
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: urls,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/storage/folders')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(createFolderSchema))
  async createFolder(@Body() body: CreateFolderDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.storage.createFolder(body.folder + body.name, body.by),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/testimonials')
  @HttpCode(HttpStatus.OK)
  async getTestimonials(@Query() query: AppQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.appService.getTestimonials(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(UserGuard)
  @Post('/testimonials/general')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createGeneralTestimonialSchema))
  async createGeneralTestimonial(
    @Body() body: CreateGeneralTestimonialDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.appService.createGeneralTestimonial(
          body,
          req.user.user_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/files')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<SuccessResponse> {
    try {
      const urls = [];
      for (const file of files) {
        urls.push({
          url: await this.storage.uploadFile({
            buffer: file.buffer,
            key: `others/${file.originalname}`,
            mimetype: file.mimetype,
          }),
        });
      }

      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: urls,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post('/converts/docx')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('files'))
  async convertFile(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 20 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ): Promise<SuccessResponse> {
    try {
      let text = '';

      for (const file of files) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text += result.value;
      }

      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: { text },
      };
    } catch (error) {
      throw error;
    }
  }
}
