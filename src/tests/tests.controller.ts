import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SuccessResponse } from 'src/utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { TestsService } from './tests.service';

@Controller('tests')
@UseGuards(UserGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

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
}
