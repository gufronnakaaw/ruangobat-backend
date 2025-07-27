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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  CoursesQuery,
  CreateContentDto,
  createContentSchema,
  CreateCourseDto,
  createCourseSchema,
  CreateSegmentDto,
  createSegmentSchema,
  CreateTestDto,
  createTestSchema,
  UpdateContentDto,
  updateContentSchema,
  UpdateCourseDto,
  UpdateSegmentDto,
  updateSegmentSchema,
  UpdateTestContentDto,
  updateTestContentSchema,
} from './courses.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(AdminGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get(':id_or_slug/detail')
  @HttpCode(HttpStatus.OK)
  async getCourse(
    @Param('id_or_slug') id_or_slug: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.getCourse(id_or_slug),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':cat_or_sub/:type')
  @HttpCode(HttpStatus.OK)
  async getCourses(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Query() query: CoursesQuery,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.getCourses(cat_or_sub, type, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('thumbnail'),
    new InputInterceptor(createCourseSchema),
  )
  async createCourse(
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
    file: Express.Multer.File,
    @Body() body: CreateCourseDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.coursesService.createCourse(body, file),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('thumbnail'),
    new InputInterceptor(createCourseSchema),
  )
  async updateCourse(
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
    file: Express.Multer.File,
    @Body() body: UpdateCourseDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.updateCourse(body, file),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('segments')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createSegmentSchema))
  async createSegment(
    @Body() body: CreateSegmentDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.coursesService.createSegment(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('segments')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateSegmentSchema))
  async updateSegment(
    @Body() body: UpdateSegmentDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.updateSegment(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('contents')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createContentSchema))
  async createContent(
    @Body() body: CreateContentDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.coursesService.createContent(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('contents')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateContentSchema))
  async updateContent(
    @Body() body: UpdateContentDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.updateContent(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('tests/:content_id')
  @HttpCode(HttpStatus.OK)
  async getTestContent(
    @Param('content_id') content_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.getTestContent(content_id),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('tests')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(createTestSchema))
  async createTest(@Body() body: CreateTestDto): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.coursesService.createTest(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('tests')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(updateTestContentSchema))
  async updateTest(
    @Body() body: UpdateTestContentDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.updateTest(body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('tests/:content_id/questions/:assq_id')
  async deleteTestQuestion(
    @Param('content_id') content_id: string,
    @Param('assq_id') assq_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.deleteTestQuestion(content_id, assq_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
