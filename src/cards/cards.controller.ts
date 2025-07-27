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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.cardsService.getCards(cat_or_sub, type),
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
            maxSize: 25 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType:
              /^(image\/jpeg|image\/jpg|image\/png|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body() body: CreateCardDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.cardsService.createCard(body, files),
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
            maxSize: 25 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType:
              /^(image\/jpeg|image\/jpg|image\/png|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
    @Body() body: UpdateCardDto,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.cardsService.updateCard(body, file),
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':card_id')
  @HttpCode(HttpStatus.OK)
  async deleteCard(
    @Param('card_id') card_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.cardsService.deleteCard(card_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
