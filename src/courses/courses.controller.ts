import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
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
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
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
} from './courses.dto';
import { CoursesService } from './courses.service';

@Controller('courses')
@UseGuards(AdminGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get(':cat_or_sub/:type')
  @HttpCode(HttpStatus.OK)
  async getCourses(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.getCourses(
          cat_or_sub,
          req.admin.role,
          type,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':cat_or_sub/:type/detail')
  @HttpCode(HttpStatus.OK)
  async getCourse(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.coursesService.getCourse(
          cat_or_sub,
          req.admin.role,
          type,
        ),
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
}
