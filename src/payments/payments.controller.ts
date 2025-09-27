import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { XenditInvoiceWebhook } from './payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('/webhook/xendit/invoices')
  @HttpCode(HttpStatus.OK)
  async handleXenditWebhookVa(
    @Body() body: XenditInvoiceWebhook,
    @Headers('x-callback-token') callback_token: string,
    @Headers('webhook-id') webhook_id: string,
  ): Promise<SuccessResponse> {
    try {
      if (callback_token !== process.env.XENDIT_CALLBACK_TOKEN) {
        throw new ForbiddenException('Invalid callback token');
      }

      console.log(body);

      return {
        success: true,
        status_code: HttpStatus.OK,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/webhook/xendit/invoices/late')
  handleXenditWebhookQris(
    @Body() body: XenditInvoiceWebhook,
    @Req() req: Request,
  ) {
    console.log(req.headers);
    console.log(body);

    return {
      success: true,
    };
  }
}
