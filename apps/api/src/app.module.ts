import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { parseEnv } from './config/env.ts';
import { buildDataSourceOptions } from './database/data-source.options.ts';
import { HealthController } from './health/health.controller.ts';
import { UsersModule } from './modules/users/users.module.ts';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // Read env lazily (when the module is created) so tests can set variables beforehand.
      useFactory: () => buildDataSourceOptions(parseEnv(process.env)),
    }),

    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
