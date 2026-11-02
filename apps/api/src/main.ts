import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { parseEnv } from './config/env.ts';

const env = parseEnv(process.env);

const app = await NestFactory.create(AppModule);

app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
);

await app.listen(env.PORT);

new Logger('Bootstrap').log(`API listening on port ${env.PORT}`);
