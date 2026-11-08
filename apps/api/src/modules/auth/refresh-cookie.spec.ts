import { describe, expect, it } from 'vitest';
import {
  buildClearedRefreshCookie,
  buildRefreshCookie,
  readRefreshCookie,
} from './refresh-cookie.ts';

describe('refresh cookie', () => {
  it('is HttpOnly, SameSite=Strict, limited to /auth and expires', () => {
    const header = buildRefreshCookie('abc', { secure: false, maxAgeSeconds: 60 });

    expect(header).toContain('refresh_token=abc');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Strict');
    expect(header).toContain('Path=/auth');
    expect(header).toContain('Max-Age=60');
    expect(header).not.toContain('Secure');
  });

  it('adds Secure when requested', () => {
    expect(buildRefreshCookie('abc', { secure: true, maxAgeSeconds: 60 })).toContain('Secure');
  });

  it('the clearing cookie expires immediately', () => {
    const header = buildClearedRefreshCookie(false);

    expect(header).toContain('refresh_token=;');
    expect(header).toContain('Max-Age=0');
  });

  it('reads the token among other cookies, and returns undefined when absent', () => {
    expect(readRefreshCookie('theme=dark; refresh_token=xyz; a=b')).toBe('xyz');
    expect(readRefreshCookie('theme=dark')).toBeUndefined();
    expect(readRefreshCookie(undefined)).toBeUndefined();
    expect(readRefreshCookie('refresh_token=')).toBeUndefined();
  });
});
