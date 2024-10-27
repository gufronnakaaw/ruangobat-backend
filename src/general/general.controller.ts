import { MailerService } from '@nestjs-modules/mailer';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
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

  @Post('/email/send')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(sendEmailSchema))
  async sendEmail(@Body() body: SendEmailDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.generalService.sendEmail(body.email),
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
}
