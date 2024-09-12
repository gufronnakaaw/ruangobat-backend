import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SuccessResponse } from './utils/global/global.response';

@Controller()
export class AppController {
  constructor() {}

  @Get()
  @HttpCode(HttpStatus.OK)
  index(): SuccessResponse {
    return {
      success: true,
      status_code: HttpStatus.OK,
      message: `Welcome to Ruang Obat ${process.env.MODE === 'prod' ? 'API' : 'Dev API'}`,
    };
  }
}
