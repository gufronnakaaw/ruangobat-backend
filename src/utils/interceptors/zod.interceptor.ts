import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { unlink } from 'fs/promises';
import { Observable } from 'rxjs';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodInterceptor implements NestInterceptor {
  constructor(private schema: ZodSchema<any>) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    const file = request.file;

    try {
      this.schema.parse(body);
    } catch (error) {
      if (file) {
        try {
          await unlink(file.path);
        } catch (error) {
          throw new InternalServerErrorException(
            'Server error saat menghapus file',
          );
        }
      }

      throw error;
    }

    return next.handle();
  }
}
