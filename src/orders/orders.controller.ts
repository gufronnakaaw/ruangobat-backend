import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { SuccessResponse } from '../utils/global/global.response';
import { UserGuard } from '../utils/guards/user.guard';
import { ZodValidationPipe } from '../utils/pipes/zod.pipe';
import { isUUID } from '../utils/string.util';
import { CreateOrderDto, createOrderSchema } from './orders.dto';
import { OrdersService } from './orders.service';

@UseGuards(UserGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body(new ZodValidationPipe(createOrderSchema))
    body: CreateOrderDto,
    @Headers('x-idempotency-key') idempotency_key: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      if (!idempotency_key || !isUUID(idempotency_key)) {
        throw new ForbiddenException('Idempotency key tidak valid');
      }

      return {
        success: true,
        status_code: HttpStatus.CREATED,
        data: await this.ordersService.createOrder(
          body,
          req.user.user_id,
          idempotency_key,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':order_id/status')
  @HttpCode(HttpStatus.OK)
  async getOrderStatus(
    @Param('order_id') order_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.ordersService.getOrderStatus(
          order_id,
          req.user.user_id,
        ),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':order_id')
  @HttpCode(HttpStatus.OK)
  async getOrder(
    @Param('order_id') order_id: string,
    @Req() req: Request,
  ): Promise<SuccessResponse> {
    try {
      return {
        success: true,
        status_code: HttpStatus.OK,
        data: await this.ordersService.getOrder(order_id, req.user.user_id),
      };
    } catch (error) {
      throw error;
    }
  }
}
