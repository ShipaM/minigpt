import { parseCookie, stringifySetCookie } from 'cookie';

export const REFRESH_COOKIE = 'refresh_token';

// The browser sends the cookie only to /auth/*: other endpoints never see the refresh token.
const COOKIE_PATH = '/auth';
const baseOptions = (secure: boolean) =>
  ({
    httpOnly: true, // not readable from page JavaScript: an XSS bug cannot steal it
    secure, // only over HTTPS (in production)
    sameSite: 'strict', // not sent on cross-site requests: protection against CSRF
    path: COOKIE_PATH,
  }) as const;

//The `Set-Cookie` header value that stores the refresh token.
export function buildRefreshCookie(
  token: string,
  settings: { secure: boolean; maxAgeSeconds: number },
): string {
  return stringifySetCookie({
    name: REFRESH_COOKIE,
    value: token,
    maxAge: settings.maxAgeSeconds,
    ...baseOptions(settings.secure),
  });
}

//The `Set-Cookie` header value that makes the browser delete the cookie.
export function buildClearedRefreshCookie(secure: boolean): string {
  return stringifySetCookie({ name: REFRESH_COOKIE, value: '', maxAge: 0, ...baseOptions(secure) });
}

//Extracts the refresh token from the `Cookie` request header (undefined if absent).
export function readRefreshCookie(header: string | undefined): string | undefined {
  if (!header) return undefined;
  return parseCookie(header)[REFRESH_COOKIE] || undefined;
}
