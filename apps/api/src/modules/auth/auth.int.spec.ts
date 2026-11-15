import { JwtService } from '@nestjs/jwt';
import { AuthResponseSchema, ErrorResponseSchema, UserResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  refreshCookieOf,
  startTestApp,
  stopTestApp,
  TEST_JWT_SECRET,
  type TestApp,
} from '../../test/test-app.ts';
import { PASSWORD, postJson, registerUser } from '../../test/test-client.ts';

describe('Auth API (integration, real Postgres)', () => {
  let t: TestApp;
  const url = (path: string) => `${t.baseUrl}${path}`;
  const me = (token: string) =>
    fetch(url('/auth/me'), { headers: { authorization: `Bearer ${token}` } });

  beforeAll(async () => {
    t = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp(t);
  });

  beforeEach(async () => {
    await t.ds.query('TRUNCATE TABLE users CASCADE');
  });

  describe('register', () => {
    it('201: matches the contract, normalizes the email, sets a safe refresh cookie', async () => {
      const res = await postJson(url('/auth/register'), {
        email: ' Ivan@Example.com ',
        displayName: 'Ivan',
        password: PASSWORD,
      });
      const body = AuthResponseSchema.parse(await res.json());
      const setCookie = res.headers.getSetCookie().join('\n');

      expect(res.status).toBe(201);
      expect(body.user.email).toBe('ivan@example.com');
      expect(setCookie).toContain('refresh_token=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Strict');
      expect(setCookie).toContain('Path=/auth');
      expect(setCookie).toContain('Max-Age=2592000'); // 30 days
      expect(JSON.stringify(body)).not.toContain('refresh');
    });

    it('stores a hash, never the password; stores a hash of the refresh token, never the token', async () => {
      const { cookie } = await registerUser(t.baseUrl, 'hash@example.com');
      const [user] = await t.ds.query('SELECT password_hash FROM users');
      const [token] = await t.ds.query('SELECT token_hash FROM refresh_tokens');

      expect(user.password_hash).toMatch(/^scrypt\$/);
      expect(user.password_hash).not.toContain(PASSWORD);
      expect(token.token_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(cookie).not.toContain(token.token_hash);
    });

    it('409 on a duplicate email, regardless of case', async () => {
      await registerUser(t.baseUrl, 'dup@example.com');
      const res = await postJson(url('/auth/register'), {
        email: 'DUP@example.com',
        displayName: 'Other',
        password: PASSWORD,
      });

      expect(res.status).toBe(409);
      expect(ErrorResponseSchema.parse(await res.json()).message).toBe(
        'A user with this email already exists',
      );
    });

    it('race: two parallel registrations with one email give one 201 and one 409', async () => {
      const body = { email: 'race@example.com', displayName: 'R', password: PASSWORD };
      const results = await Promise.all([
        postJson(url('/auth/register'), body),
        postJson(url('/auth/register'), body),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await t.ds.query('SELECT count(*)::int AS n FROM users')).toEqual([{ n: 1 }]);
    });

    it('400 for a short password and for extra fields (cannot set a role or an id)', async () => {
      const short = await postJson(url('/auth/register'), {
        email: 'a@example.com',
        displayName: 'A',
        password: 'short',
      });

      const extra = await postJson(url('/auth/register'), {
        email: 'b@example.com',
        displayName: 'B',
        password: PASSWORD,
        role: 'admin',
        id: '00000000-0000-4000-8000-000000000000',
      });

      expect(short.status).toBe(400);
      expect(extra.status).toBe(400);
      expect(ErrorResponseSchema.parse(await extra.json()).details).toEqual(
        expect.arrayContaining(['property role should not exist']),
      );
      expect(await t.ds.query('SELECT count(*)::int AS n FROM users')).toEqual([{ n: 0 }]);
    });
  });

  describe('login', () => {
    it('200 with the right password', async () => {
      await registerUser(t.baseUrl, 'login@example.com');

      const res = await postJson(url('/auth/login'), {
        email: 'LOGIN@example.com',
        password: PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(AuthResponseSchema.safeParse(await res.json()).success).toBe(true);
      expect(refreshCookieOf(res)).toMatch(/^refresh_token=.+/);
    });

    it('the same 401 message for a wrong password and for an unknown email', async () => {
      await registerUser(t.baseUrl, 'known@example.com');
      const wrong = await postJson(url('/auth/login'), {
        email: 'known@example.com',
        password: 'wrong password',
      });

      const unknown = await postJson(url('/auth/login'), {
        email: 'nobody@example.com',
        password: PASSWORD,
      });

      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(ErrorResponseSchema.parse(await wrong.json()).message).toBe(
        'Invalid email or password',
      );
      expect(ErrorResponseSchema.parse(await unknown.json()).message).toBe(
        'Invalid email or password',
      );
    });

    it('a user with an empty password hash (left by a migration) cannot log in', async () => {
      await registerUser(t.baseUrl, 'legacy@example.com');
      await t.ds.query("UPDATE users SET password_hash = ''");

      const res = await postJson(url('/auth/login'), {
        email: 'legacy@example.com',
        password: PASSWORD,
      });

      expect(res.status).toBe(401);
    });
  });

  describe('access token and the global guard', () => {
    it('GET /auth/me: 401 without a token or with garbage, 200 with a valid token', async () => {
      const user = await registerUser(t.baseUrl, 'me@example.com');

      expect((await fetch(url('/auth/me'))).status).toBe(401);
      expect((await me('not-a-jwt')).status).toBe(401);

      const ok = await me(user.accessToken);

      expect(ok.status).toBe(200);
      expect(UserResponseSchema.parse(await ok.json()).email).toBe('me@example.com');
    });

    it('rejects a token signed with another secret and an expired token', async () => {
      const user = await registerUser(t.baseUrl, 'forge@example.com');
      const forged = await new JwtService({ secret: 'y'.repeat(32) }).signAsync({
        sub: user.user.id,
      });
      const expired = await new JwtService({ secret: TEST_JWT_SECRET }).signAsync({
        sub: user.user.id,
        exp: Math.floor(Date.now() / 1000) - 10,
      });

      expect((await me(forged)).status).toBe(401);
      expect((await me(expired)).status).toBe(401);
    });

    it('the 401 body uses the common error format', async () => {
      const res = await fetch(url('/auth/me'));

      expect(res.status).toBe(401);
      expect(ErrorResponseSchema.safeParse(await res.json()).success).toBe(true);
    });
  });

  describe('refresh and logout', () => {
    it('rotates the refresh token: new cookie, working access token, old cookie is dead', async () => {
      const first = await registerUser(t.baseUrl, 'rotate@example.com');
      const res = await postJson(url('/auth/refresh'), {}, first.cookie);
      const second = refreshCookieOf(res);

      expect(res.status).toBe(200);
      expect(second).not.toBe(first.cookie);
      expect((await me(AuthResponseSchema.parse(await res.json()).accessToken)).status).toBe(200);
      expect((await postJson(url('/auth/refresh'), {}, first.cookie)).status).toBe(401);
    });

    it('reuse of an old refresh token revokes every session of that user (theft detection)', async () => {
      const first = await registerUser(t.baseUrl, 'theft@example.com');
      const rotated = refreshCookieOf(await postJson(url('/auth/refresh'), {}, first.cookie));

      // The "thief" presents the old token: rejected, and the legitimate new token is revoked aswell.
      expect((await postJson(url('/auth/refresh'), {}, first.cookie)).status).toBe(401);
      expect((await postJson(url('/auth/refresh'), {}, rotated)).status).toBe(401);
      expect(
        await t.ds.query('SELECT count(*)::int AS n FROM refresh_tokens WHERE revoked_at IS NULL'),
      ).toEqual([{ n: 0 }]);
    });

    it('401 without a cookie, with an unknown token, and with an expired token', async () => {
      const user = await registerUser(t.baseUrl, 'expire@example.com');

      expect((await postJson(url('/auth/refresh'), {})).status).toBe(401);
      expect(
        (await postJson(url('/auth/refresh'), {}, 'refresh_token=not-a-real-token')).status,
      ).toBe(401);

      await t.ds.query("UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'");

      expect((await postJson(url('/auth/refresh'), {}, user.cookie)).status).toBe(401);
    });

    it('logout revokes the token and clears the cookie; it is idempotent', async () => {
      const user = await registerUser(t.baseUrl, 'logout@example.com');
      const res = await postJson(url('/auth/logout'), {}, user.cookie);

      expect(res.status).toBe(204);
      expect(res.headers.getSetCookie().join('\n')).toContain('Max-Age=0');
      expect((await postJson(url('/auth/refresh'), {}, user.cookie)).status).toBe(401);
      expect((await postJson(url('/auth/logout'), {})).status).toBe(204);
      expect((await postJson(url('/auth/logout'), {}, user.cookie)).status).toBe(204);
    });

    it('two parallel refreshes with one token: exactly one wins', async () => {
      const user = await registerUser(t.baseUrl, 'parallel@example.com');
      const results = await Promise.all([
        postJson(url('/auth/refresh'), {}, user.cookie),
        postJson(url('/auth/refresh'), {}, user.cookie),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });
  });
});
