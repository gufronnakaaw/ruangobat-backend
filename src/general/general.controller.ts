import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { SuccessResponse } from '../utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import { CreateFeedbackDto, createFeedbackSchema } from './general.dto';
import { GeneralService } from './general.service';

@Controller('general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

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
}
