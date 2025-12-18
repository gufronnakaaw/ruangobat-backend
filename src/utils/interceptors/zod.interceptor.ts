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

    try {
      this.schema.parse(request.body);
      return next.handle();
    } catch (error) {
      if (request.file) {
        try {
          await unlink(request.file.path);
        } catch (error) {
          throw new InternalServerErrorException(
            'Server error saat menghapus file',
          );
        }
      }

      throw error;
    }
  }
}
