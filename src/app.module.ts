import { MailerModule } from '@nestjs-modules/mailer';
import { CacheModule } from '@nestjs/cache-manager';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AccessesModule } from './accesses/accesses.module';
import { ActivitiesModule } from './activities/activities.module';
import { AdminModule } from './admin/admin.module';
import { AdminsModule } from './admins/admins.module';
import { AdsModule } from './ads/ads.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticlesModule } from './articles/articles.module';
import { AuthModule } from './auth/auth.module';
import { BatchesModule } from './batches/batches.module';
import { CardsModule } from './cards/cards.module';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { CronModule } from './cron/cron.module';
import { MyModule } from './my/my.module';
import { ProgramsModule } from './programs/programs.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TestsModule } from './tests/tests.module';
import { TopicsModule } from './topics/topics.module';
import { GlobalMiddleware } from './utils/global/global.middleware';
import { PrismaService } from './utils/services/prisma.service';
import { StorageService } from './utils/services/storage.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET_KEY,
      signOptions: {
        expiresIn: '6h',
      },
    }),
    ScheduleModule.forRoot(),
    CacheModule.register({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/public',
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: true,
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
    }),
    AuthModule,
    TestsModule,
    MyModule,
    ProgramsModule,
    AdminModule,
    AdminsModule,
    AiModule,
    SubscriptionsModule,
    CategoriesModule,
    CardsModule,
    CoursesModule,
    QuizzesModule,
    BatchesModule,
    StatisticsModule,
    AccessesModule,
    CronModule,
    ActivitiesModule,
    AdsModule,
    TopicsModule,
    ArticlesModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, StorageService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(GlobalMiddleware).exclude('public/(.*)').forRoutes('*');
  }
}
