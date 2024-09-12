import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class GlobalMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req['fullurl'] =
      `${req.get('X-Forwarded-Proto') || req.protocol}://${req.get('Host')}`;
    next();
  }
}
