import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DataSource } from 'typeorm';
import { ErrorResponseSchema, UserResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureDatabase, resetDatabase, TEST_DATABASE_URL } from '../../test/test-db.ts';

describe('Users API (integration, real Postgres)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let baseUrl: string;

  beforeAll(async () => {
    await ensureDatabase(TEST_DATABASE_URL);
    ds = await resetDatabase();

    // Set env before importing AppModule (it reads process.env lazily, but explicit is safer).
    process.env['DATABASE_URL'] = TEST_DATABASE_URL;
    process.env['NODE_ENV'] = 'test';
    process.env['JWT_ACCESS_SECRET'] = 'x'.repeat(32);

    const { AppModule } = await import('../../app.module.ts');
    const { configureApp } = await import('../../app.setup.ts');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
    await ds?.destroy();
  });

  beforeEach(async () => {
    await ds.query('TRUNCATE TABLE users');
  });

  const create = (email: string, displayName = 'Ivan') =>
    fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, displayName }),
    });

  it('creates a user, the response matches the contract, the row is in the DB', async () => {
    const res = await create('Ivan@Example.com');
    const body = UserResponseSchema.parse(await res.json());

    expect(res.status).toBe(201);
    expect(body.email).toBe('ivan@example.com');
    expect(await ds.query('SELECT email, display_name FROM users')).toEqual([
      { email: 'ivan@example.com', display_name: 'Ivan' },
    ]);
  });

  it('409 on a duplicate email, regardless of case', async () => {
    expect((await create('a@example.com')).status).toBe(201);

    const res = await create('A@Example.com');

    expect(res.status).toBe(409);
    expect(ErrorResponseSchema.parse(await res.json()).message).toBe(
      'A user with this email already exists',
    );
    expect(await ds.query('SELECT count(*)::int AS n FROM users')).toEqual([{ n: 1 }]);
  });

  it('race: two parallel requests with one email give exactly one 201 and one 409', async () => {
    const results = await Promise.all([create('race@example.com'), create('race@example.com')]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await ds.query('SELECT count(*)::int AS n FROM users')).toEqual([{ n: 1 }]);
  });

  it('GET returns the created user, 404 for an unknown id', async () => {
    const created = UserResponseSchema.parse(await (await create('get@example.com')).json());

    const found = await fetch(`${baseUrl}/users/${created.id}`);
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual(created);

    const missing = await fetch(`${baseUrl}/users/00000000-0000-4000-8000-000000000000`);
    expect(missing.status).toBe(404);
  });

  it('GET /users returns all created users, oldest first', async () => {
    expect((await fetch(`${baseUrl}/users`)).status).toBe(200);
    expect(await (await fetch(`${baseUrl}/users`)).json()).toEqual([]);

    // Emails go against alphabetical order, so the test fails if sorting is not by createdAt.
    const first = UserResponseSchema.parse(await (await create('z@example.com', 'Z')).json());
    const second = UserResponseSchema.parse(await (await create('a@example.com', 'A')).json());

    const res = await fetch(`${baseUrl}/users`);
    const body = UserResponseSchema.array().parse(await res.json());

    expect(res.status).toBe(200);
    expect(body).toEqual([first, second]);
  });

  it('/health responds when the database is connected', async () => {
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
  });
});
