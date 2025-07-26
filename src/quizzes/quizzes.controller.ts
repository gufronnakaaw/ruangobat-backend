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
  CreateQuizDto,
  createQuizSchema,
  QuizzesQuery,
  UpdateQuizDto,
  updateQuizSchema,
} from './quizzes.dto';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
@UseGuards(AdminGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get(':cat_or_sub/:type')
  @HttpCode(HttpStatus.OK)
  async getQuizzes(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'apotekerclass' | 'videocourse' | 'videoukmppai',
    @Query() query: QuizzesQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.quizzesService.getQuizzes(cat_or_sub, type, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':ass_id/detail')
  @HttpCode(HttpStatus.OK)
  async getQuiz(
    @Param('ass_id') ass_id: string,
    @Query() query: QuizzesQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.quizzesService.getQuiz(ass_id, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createQuizSchema))
  async createQuiz(@Body() body: CreateQuizDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.quizzesService.createQuiz(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateQuizSchema))
  async updateQuiz(@Body() body: UpdateQuizDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.quizzesService.updateQuiz(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':ass_id/questions/:assq_id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(
    @Param() params: { ass_id: string; assq_id: string },
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.quizzesService.deleteQuestion(params),
      };
    } catch (error) {
      throw error;
    }
  }
}
