import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ZodSchema } from 'zod';

@Injectable()
export class InputInterceptor implements NestInterceptor {
  constructor(private schema: ZodSchema<any>) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    this.schema.parse(request.body);
    return next.handle();
  }
}
