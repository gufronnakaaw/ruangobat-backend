import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from 'src/utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { StartTestQuestion } from './tests.dto';
import { TestsService } from './tests.service';

@Controller('tests')
@UseGuards(UserGuard)
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get(':test_id')
  @HttpCode(HttpStatus.OK)
  async getTest(@Param('test_id') test_id: string): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.testsService.getTest(test_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':test_id/start')
  @HttpCode(HttpStatus.OK)
  async startTest(
    @Param('test_id') test_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      const cache = (await this.cacheManager.get(
        test_id,
      )) as StartTestQuestion[];

      if (cache) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.testsService.startTest({
            test_id,
            user_id: req.user.user_id,
            questions: cache,
          }),
        };
      }

      const questions = await this.testsService.getQuestions(test_id);
      await this.cacheManager.set(test_id, questions, 120000);

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.testsService.startTest({
          test_id,
          user_id: req.user.user_id,
          questions,
        }),
      };
    } catch (error) {
      throw error;
    }
  }
}
