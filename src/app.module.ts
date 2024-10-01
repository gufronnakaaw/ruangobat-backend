import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { MyModule } from './my/my.module';
import { ProgramsModule } from './programs/programs.module';
import { TestsModule } from './tests/tests.module';

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
    MyModule,
    ProgramsModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
