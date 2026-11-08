import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DataSource } from 'typeorm';
import { ensureDatabase, resetDatabase, TEST_DATABASE_URL } from './test-db.ts';

export const TEST_JWT_SECRET = 'x'.repeat(32);

export interface TestApp {
  app: INestApplication;
  ds: DataSource;
  baseUrl: string;
}

/** Starts the real application (all modules, the real database) on a random port. */
export async function startTestApp(): Promise<TestApp> {
  await ensureDatabase(TEST_DATABASE_URL);

  const ds = await resetDatabase();
  // Set env before importing AppModule (it reads process.env lazily, but explicit is safer).
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_ACCESS_SECRET'] = TEST_JWT_SECRET;

  const { AppModule } = await import('../app.module.ts');
  const { configureApp } = await import('../app.setup.ts');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();

  configureApp(app);

  await app.listen(0);

  return { app, ds, baseUrl: await app.getUrl() };
}

export async function stopTestApp(t: Partial<TestApp>): Promise<void> {
  await t.app?.close();
  await t.ds?.destroy();
}
// `refresh_token=VALUE` from the Set-Cookie headers of a response (what a browser would send back).
export function refreshCookieOf(res: Response): string {
  const header = res.headers.getSetCookie().find((c) => c.startsWith('refresh_token='));
  if (!header) throw new Error('The response has no refresh_token cookie');
  return header.split(';')[0] ?? '';
}
