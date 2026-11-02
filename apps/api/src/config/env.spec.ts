import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.ts';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('parseEnv', () => {
  it('applies default values', () => {
    const env = parseEnv(valid);
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('coerces PORT to a number', () => {
    expect(parseEnv({ ...valid, PORT: '5000' }).PORT).toBe(5000);
  });

  it('throws without DATABASE_URL', () => {
    expect(() => parseEnv({ JWT_ACCESS_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(/DATABASE_URL/);
  });

  it('throws on a short JWT secret', () => {
    expect(() => parseEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects the .env.example JWT secret in production', () => {
    const placeholder = 'change-me-change-me-change-me-change-me';
    expect(() =>
      parseEnv({ ...valid, NODE_ENV: 'production', JWT_ACCESS_SECRET: placeholder }),
    ).toThrow(/JWT_ACCESS_SECRET/);
    expect(parseEnv({ ...valid, JWT_ACCESS_SECRET: placeholder }).JWT_ACCESS_SECRET).toBe(
      placeholder,
    );
  });

  it('accepts a custom JWT secret in production', () => {
    expect(parseEnv({ ...valid, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
  });

  it('accepts DATABASE_URL only with a postgres scheme', () => {
    expect(parseEnv({ ...valid, DATABASE_URL: 'postgres://u:p@localhost/db' }).DATABASE_URL).toBe(
      'postgres://u:p@localhost/db',
    );
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'http://example.com' })).toThrow(
      /DATABASE_URL/,
    );
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mailto:a@b.c' })).toThrow(/DATABASE_URL/);
  });

  it('rejects an out-of-range PORT', () => {
    expect(parseEnv({ ...valid, PORT: '65535' }).PORT).toBe(65535);
    expect(() => parseEnv({ ...valid, PORT: '70000' })).toThrow(/PORT/);
    expect(() => parseEnv({ ...valid, PORT: '0' })).toThrow(/PORT/);
  });

  it('treats an empty PORT as unset', () => {
    expect(parseEnv({ ...valid, PORT: '' }).PORT).toBe(4000);
  });
});
