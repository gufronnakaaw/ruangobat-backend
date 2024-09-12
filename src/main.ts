import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './utils/global/global.exception';

async function bootstrap() {
  const options = {};

  if (process.env.MODE === 'prod') {
    Object.assign(options, {
      cors: {
        origin: [
          'https://ruangobat.id',
          'https://cbt.ruangobat.id',
          'https://admin.ruangobat.id',
        ],
      },
    });
  } else {
    Object.assign(options, { cors: true });
  }

  const app = await NestFactory.create(AppModule, options);

  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });

  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  app.useGlobalFilters(new GlobalExceptionFilter(app.get(HttpAdapterHost)));
  await app.listen(process.env.MODE === 'prod' ? 3002 : 3003);
}
bootstrap();
