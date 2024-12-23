import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { diskStorage } from 'multer';
import { SuccessResponse } from 'src/utils/global/global.response';
import { ZodValidationPipe } from 'src/utils/pipes/zod.pipe';
import { UserGuard } from '../utils/guards/user.guard';
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
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      storage: diskStorage({
        destination: './public/media',
        filename(req, file, callback) {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter(req, file, callback) {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return callback(
            new BadRequestException('Hanya gambar yang diperbolehkan'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 4 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @UploadedFiles() files: Array<Express.Multer.File>,
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
          fullurl: req.fullurl,
        }),
      };
    } catch (error) {
      throw error;
    }
  }
}
