import { ErrorResponseSchema, UserResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startTestApp, stopTestApp, type TestApp } from '../../test/test-app.ts';
import { registerUser } from '../../test/test-client.ts';

describe('Users API (integration, real Postgres)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(t);
  });

  beforeEach(async () => {
    await t.ds.query('TRUNCATE TABLE users CASCADE');
  });

  it('a user reads their own profile', async () => {
    const me = await registerUser(t.baseUrl, 'get@example.com');
    const res = await fetch(`${t.baseUrl}/users/${me.user.id}`, {
      headers: { authorization: `Bearer ${me.accessToken}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(UserResponseSchema.parse(me.user));
  });

  it("403 for another user's profile and for an id that does not exist (no way to probe ids)", async () => {
    const alice = await registerUser(t.baseUrl, 'alice@example.com');
    const bob = await registerUser(t.baseUrl, 'bob@example.com');
    const headers = { authorization: `Bearer ${alice.accessToken}` };
    const other = await fetch(`${t.baseUrl}/users/${bob.user.id}`, { headers });
    const missing = await fetch(`${t.baseUrl}/users/00000000-0000-4000-8000-000000000000`, {
      headers,
    });
    expect(other.status).toBe(403);
    expect(missing.status).toBe(403);
    expect(ErrorResponseSchema.parse(await other.json()).message).toBe(
      ErrorResponseSchema.parse(await missing.json()).message,
    );
  });

  it('401 without a token', async () => {
    const me = await registerUser(t.baseUrl, 'anon@example.com');
    const res = await fetch(`${t.baseUrl}/users/${me.user.id}`);
    expect(res.status).toBe(401);
  });

  it('POST /users no longer exists: users are created only by registration', async () => {
    const res = await fetch(`${t.baseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'x@example.com', displayName: 'X' }),
    });
    expect([401, 404]).toContain(res.status);
    expect(await t.ds.query('SELECT count(*)::int AS n FROM users')).toEqual([{ n: 0 }]);
  });

  it('/health is public and works with a connected database', async () => {
    expect((await fetch(`${t.baseUrl}/health`)).status).toBe(200);
  });
});
