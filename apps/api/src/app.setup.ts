import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/all-exceptions.filter.ts';

/**
 * Shared application setup. Called both from main.ts and from tests, so the tests
 * exercise exactly the same behavior as production.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields that are not in the DTO
      forbidNonWhitelisted: true, // and answers 400 if extra fields arrive (mass assignment protection)
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder().setTitle('MiniGPT API').setVersion('0.1').build();

  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
