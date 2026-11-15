import { Injectable } from '@nestjs/common';
import { parseEnv } from '../../config/env.ts';

//Auth-related settings from the validated environment (read when the application starts).
@Injectable()
export class AuthSettings {
  readonly accessTtlSeconds: number;
  readonly refreshTtlDays: number;
  //Cookies are marked Secure in production (HTTPS only); plain http://localhost works in development.
  readonly secureCookies: boolean;
  constructor() {
    const env = parseEnv(process.env);
    this.accessTtlSeconds = env.JWT_ACCESS_TTL_SECONDS;
    this.refreshTtlDays = env.REFRESH_TOKEN_TTL_DAYS;
    this.secureCookies = env.NODE_ENV === 'production';
  }

  get refreshTtlSeconds(): number {
    return this.refreshTtlDays * 24 * 60 * 60;
  }
}
