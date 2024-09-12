import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ErrorResponse } from './global.response';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = HttpStatus;

    if (exception instanceof HttpException) {
      const { name, message } = exception;

      const responseBody: ErrorResponse = {
        success: false,
        status_code: exception.getStatus(),
        error: {
          name,
          message,
          errors: null,
        },
      };

      return httpAdapter.reply(
        ctx.getResponse(),
        responseBody,
        exception.getStatus(),
      );
    }

    if (exception instanceof ZodError) {
      const { issues, name } = exception;

      const errors = issues.map((error) => {
        return {
          field: error.code == 'unrecognized_keys' ? error.keys : error.path,
          message: error.message,
        };
      });

      const responseBody: ErrorResponse = {
        success: false,
        status_code: BAD_REQUEST,
        error: {
          name,
          message: 'Validation failed',
          errors,
        },
      };

      return httpAdapter.reply(ctx.getResponse(), responseBody, BAD_REQUEST);
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const responseBody: ErrorResponse = {
        success: false,
        status_code: INTERNAL_SERVER_ERROR,
        error: {
          name: exception.name,
          message: exception.message,
          errors: {
            code: exception.code,
            meta: exception.meta,
            stack: exception.stack,
          },
        },
      };

      return httpAdapter.reply(
        ctx.getResponse(),
        responseBody,
        INTERNAL_SERVER_ERROR,
      );
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      const responseBody: ErrorResponse = {
        success: false,
        status_code: INTERNAL_SERVER_ERROR,
        error: {
          name: exception.name,
          message: exception.message,
          errors: null,
        },
      };

      return httpAdapter.reply(
        ctx.getResponse(),
        responseBody,
        INTERNAL_SERVER_ERROR,
      );
    }

    if (exception instanceof Error) {
      const { name, message } = exception as {
        name: string;
        message: string;
      };

      const responseBody: ErrorResponse = {
        success: false,
        status_code: INTERNAL_SERVER_ERROR,
        error: {
          name,
          message,
          errors: null,
        },
      };

      return httpAdapter.reply(
        ctx.getResponse(),
        responseBody,
        INTERNAL_SERVER_ERROR,
      );
    }
  }
}
