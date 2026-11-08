import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { configureApp, setupSwagger } from './app.setup.ts';
import { parseEnv } from './config/env.ts';

const env = parseEnv(process.env);

const app = await NestFactory.create(AppModule);

configureApp(app);

if (env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

app.enableShutdownHooks();

await app.listen(env.PORT);

new Logger('Bootstrap').log(`API listening on port ${env.PORT}`);
