import { NestApplicationOptions } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './utils/global/global.exception';

async function bootstrap() {
  const is_prod = process.env.MODE === 'prod';

  const options: NestApplicationOptions = {
    cors: is_prod
      ? {
          origin: /^https?:\/\/(admin\.|files\.)?ruangobat\.id$/,
        }
      : true,
  };

  const app = await NestFactory.create(AppModule, options);

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));

  await app.listen(is_prod ? 3002 : 3003);
}
bootstrap();
