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
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { PublicGuard } from '../utils/guards/public.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import { StorageService } from '../utils/services/storage.service';
import {
  ArticlesQuery,
  CreateArticleDto,
  createArticleSchema,
  UpdateArticleDto,
  updateArticleSchema,
} from './articles.dto';
import { ArticlesService } from './articles.service';

@Controller('articles')
export class ArticlesController {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly storage: StorageService,
  ) {}

  @UseGuards(AdminGuard)
  @Post('/image')
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
          key: `articles/${Date.now()}-${file.originalname}`,
          mimetype: file.mimetype,
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/homepage')
  @HttpCode(HttpStatus.OK)
  async getArticlesHomepage(): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.articlesService.getArticlesHomepage(),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getArticles(@Query() query: ArticlesQuery): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.articlesService.getArticles(query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('/topics/:topic')
  @HttpCode(HttpStatus.OK)
  async getArticlesByTopic(
    @Param('topic') topic: string,
    @Query() query: ArticlesQuery,
  ): Promise<SuccessResponse> {
    try {
      const data = await this.articlesService.getArticlesByTopic(topic, query);
      return {
        success: true,
        status_code: HttpStatus.OK,
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(PublicGuard)
  @Get(':id_or_slug')
  @HttpCode(HttpStatus.OK)
  async getArticle(
    @Param('id_or_slug') id_or_slug: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      const data = !req.is_admin
        ? await this.articlesService.getPublicArticle(id_or_slug)
        : await this.articlesService.getArticle(id_or_slug);

      return {
        success: true,
        status_code: HttpStatus.OK,
        data,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('articles'),
    new InputInterceptor(createArticleSchema),
  )
  async createArticle(
    @Body() body: CreateArticleDto,
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
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.articlesService.createArticle(
          body,
          file,
          req.admin.fullname,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('articles'),
    new InputInterceptor(updateArticleSchema),
  )
  async updateArticle(
    @Body() body: UpdateArticleDto,
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
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.articlesService.updateArticle(
          body,
          file,
          req.admin.fullname,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AdminGuard)
  @Delete(':article_id')
  @HttpCode(HttpStatus.OK)
  async deleteArticle(
    @Param('article_id') article_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.articlesService.deleteArticle(article_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
