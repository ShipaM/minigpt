import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { parseEnv } from '../../config/env.ts';
import { UsersModule } from '../users/users.module.ts';
import { AuthController } from './auth.controller.ts';
import { AuthService } from './auth.service.ts';
import { AuthSettings } from './auth.settings.ts';
import { JwtAuthGuard } from './jwt-auth.guard.ts';
import { PasswordService } from './password.service.ts';
import { RefreshTokenEntity } from './refresh-token.entity.ts';
import { TokensService } from './tokens.service.ts';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    UsersModule,
    JwtModule.registerAsync({
      // Read env lazily (when the module is created), like the database settings in AppModule.
      useFactory: () => {
        const env = parseEnv(process.env);
        return {
          secret: env.JWT_ACCESS_SECRET,
          // The algorithm is fixed on both sides: a token cannot choose how it is verified.
          signOptions: { algorithm: 'HS256', expiresIn: env.JWT_ACCESS_TTL_SECONDS },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthSettings,
    PasswordService,
    TokensService,
    // Global guard: protects every endpoint of the application by default.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
