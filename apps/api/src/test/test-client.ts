import { AuthResponseSchema, type AuthResponse } from '@minigpt/contracts';
import { refreshCookieOf } from './test-app.ts';

export const PASSWORD = 'correct horse battery';
export const postJson = (url: string, body: unknown, cookie?: string): Promise<Response> =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

// Registers a user and returns what the client would keep: the access token and the refresh cookie.
export async function registerUser(
  baseUrl: string,
  email: string,
  password = PASSWORD,
): Promise<AuthResponse & { cookie: string }> {
  const res = await postJson(`${baseUrl}/auth/register`, { email, displayName: 'Test', password });

  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${await res.text()}`);

  const cookie = refreshCookieOf(res);

  return { ...AuthResponseSchema.parse(await res.json()), cookie };
}
