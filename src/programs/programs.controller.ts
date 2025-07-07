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
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import {
  FollowPaidProgramsDto,
  followPaidProgramsSchema,
  ProgramsQuery,
} from './programs.dto';
import { ProgramsService } from './programs.service';

@UseGuards(UserGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPrograms(
    @Req() req: Request,
    @Query() query: ProgramsQuery,
  ): Promise<SuccessResponse> {
    try {
      if (query.q) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.programsService.getProgramsBySearch(
            req.user.user_id,
            query,
          ),
        };
      }

      if (query.type) {
        return {
          success: true,
          status_code: HttpStatus.OK,
          data: await this.programsService.getProgramsByType(
            req.user.user_id,
            query,
          ),
        };
      }

      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.programsService.getPrograms(req.user.user_id, query),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':program_id')
  @HttpCode(HttpStatus.OK)
  async getProgram(
    @Req() req: Request,
    @Param('program_id') program_id: string,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.programsService.getProgram(
          req.user.user_id,
          program_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/follow/paid')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(followPaidProgramsSchema))
  async followPrograms(
    @Body() body: FollowPaidProgramsDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.programsService.followPaidProgram(
          body,
          req.user.user_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/follow/free')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFile(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
            message: 'Ukuran file terlalu besar',
          }),
          new FileTypeValidator({
            fileType: /\/(jpeg|jpg|png)$/,
          }),
        ],
        fileIsRequired: false,
      }),
    )
    files: Express.Multer.File[],
    @Body() body: { program_id: string },
    @Req() req: Request,
  ) {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.programsService.followFreeProgram({
          program_id: body.program_id,
          user_id: req.user.user_id,
          files,
        }),
      };
    } catch (error) {
      throw error;
    }
  }
}
