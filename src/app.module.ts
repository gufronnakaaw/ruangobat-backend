import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

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
    AuthModule,
    TestsModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
