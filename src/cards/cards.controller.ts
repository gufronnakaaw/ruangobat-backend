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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { AdminGuard } from '../utils/guards/admin.guard';
import { InputInterceptor } from '../utils/interceptors/input.interceptor';
import {
  CreateCardDto,
  createCardSchema,
  UpdateCardDto,
  updateCardSchema,
} from './cards.dto';
import { CardsService } from './cards.service';

@Controller('cards')
@UseGuards(AdminGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':cat_or_sub/:type')
  @HttpCode(HttpStatus.OK)
  async getCards(
    @Param('cat_or_sub') cat_or_sub: string,
    @Param('type') type: 'videocourse' | 'apotekerclass' | 'videoukmppai',
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.cardsService.getCards(
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
    FilesInterceptor('files'),
    new InputInterceptor(createCardSchema),
  )
  async createCard(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|ppt|pptx|doc|docx)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body() body: CreateCardDto,
  ): Promise<SuccessResponse> {
    try {
      await this.cardsService.createCard(body, files);

      return {
        success: true,
        status_code: HttpStatus.CREATED,
      };
    } catch (error) {
      throw error;
    }
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file'),
    new InputInterceptor(updateCardSchema),
  )
  async updateCard(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png|ppt|pptx|doc|docx)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
    @Body() body: UpdateCardDto,
  ): Promise<SuccessResponse> {
    try {
      await this.cardsService.updateCard(body, file);

      return {
        success: true,
        status_code: HttpStatus.OK,
      };
    } catch (error) {
      throw error;
    }
  }
}
