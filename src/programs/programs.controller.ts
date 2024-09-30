import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from 'src/utils/global/global.response';
import { ZodValidationPipe } from 'src/utils/pipes/zod.pipe';
import { UserGuard } from '../utils/guards/user.guard';
import {
  FollowProgramsDto,
  followProgramsSchema,
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

  @Post('/follow')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(followProgramsSchema))
  async followPrograms(
    @Body() body: FollowProgramsDto,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.programsService.followPrograms(body, req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
