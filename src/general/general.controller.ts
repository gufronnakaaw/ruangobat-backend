import { MailerService } from '@nestjs-modules/mailer';
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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { diskStorage } from 'multer';
import path from 'path';
import { AdminGuard } from 'src/utils/guards/admin.guard';
import { SuccessResponse } from '../utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  CreateFeedbackDto,
  createFeedbackSchema,
  ResetPasswordDto,
  resetPasswordSchema,
  SendEmailDto,
  sendEmailSchema,
  VerifyOtpDto,
  verifyOtpSchema,
} from './general.dto';
import { GeneralService } from './general.service';

@Controller('general')
export class GeneralController {
  constructor(
    private readonly generalService: GeneralService,
    private mailerService: MailerService,
  ) {}

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
        data: await this.generalService.createFeedback(body),
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
        data: await this.generalService.sendForgotPasswordOTP(body.email),
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
        data: await this.generalService.sendRegistrationOTP(body.email),
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
        data: await this.generalService.verifyOtp(body),
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
        data: await this.generalService.resetPassword(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/questions/image')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('upload', {
      storage: diskStorage({
        destination: './public/questions',
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
  uploadQuestionsImage(
    @UploadedFile() upload: Express.Multer.File,
    @Req() req: Request,
  ) {
    try {
      return {
        url: `${req.fullurl}/${upload.path.split(path.sep).join('/')}`,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('/start/:test_id/:user_id')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteResult(
    @Param() params: { test_id: string; user_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.generalService.deleteStart(params),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/mentors')
  @HttpCode(HttpStatus.OK)
  async getMentors(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.generalService.getMentors(),
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
        data: await this.generalService.getMentor(mentor_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
