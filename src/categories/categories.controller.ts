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
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import {
  CategoriesQuery,
  CreateCategoryDto,
  createCategorySchema,
  createSubCategorySchema,
  UpdateCategoryDto,
  updateCategorySchema,
  updateSubCategorySchema,
} from './categories.dto';
import { CategoriesService } from './categories.service';

@Controller()
@UseGuards(AdminGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async getCategories(
    @Query() query: CategoriesQuery,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.categoriesService.getCategories(query, req.admin.role),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('categories/:id_or_slug/:type')
  @HttpCode(HttpStatus.OK)
  async getCategory(
    @Param('id_or_slug') id_or_slug: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.categoriesService.getCategory(
          id_or_slug,
          req.admin.role,
          type,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image'),
    new InputInterceptor(createCategorySchema),
  )
  async createCategory(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|svg\+xml)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: CreateCategoryDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.categoriesService.createCategory(file, body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('categories')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image'),
    new InputInterceptor(updateCategorySchema),
  )
  async updateCategory(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|svg\+xml)/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
    @Body() body: UpdateCategoryDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.categoriesService.updateCategory(file, body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('subcategories/:id_or_slug/:type')
  @HttpCode(HttpStatus.OK)
  async getSubCategory(
    @Param('id_or_slug') id_or_slug: string,
    @Param('type') type: 'videocourse' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.categoriesService.getSubCategory(
          id_or_slug,
          req.admin.role,
          type,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('subcategories')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('image'),
    new InputInterceptor(createSubCategorySchema),
  )
  async createSubcategory(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|svg\+xml)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: CreateCategoryDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.categoriesService.createSubcategory(file, body),
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch('subcategories')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image'),
    new InputInterceptor(updateSubCategorySchema),
  )
  async updateSubcategory(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 2 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /image\/(jpeg|png|svg\+xml)/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
    @Body() body: CreateCategoryDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.categoriesService.updateSubcategory(file, body),
      };
    } catch (error) {
      throw error;
    }
  }
}
