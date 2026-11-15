import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { parseEnv } from './config/env.ts';
import { buildDataSourceOptions } from './database/data-source.options.ts';
import { HealthController } from './health/health.controller.ts';
import { AuthModule } from './modules/auth/auth.module.ts';
import { ChatsModule } from './modules/chats/chats.module.ts';
import { UsersModule } from './modules/users/users.module.ts';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // Read env lazily (when the module is created) so tests can set variables beforehand.
      useFactory: () => buildDataSourceOptions(parseEnv(process.env)),
    }),

    // The command and query buses (one for the whole application).
    CqrsModule.forRoot(),
    UsersModule,
    AuthModule,
    ChatsModule,
  ],

  controllers: [HealthController],
})
export class AppModule {}
