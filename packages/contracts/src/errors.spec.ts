import { describe, expect, it } from 'vitest';
import { ErrorResponseSchema } from './errors.ts';

const validError = {
  statusCode: 404,
  error: 'Not Found',
  message: 'User not found',
  path: '/users/me',
  timestamp: '2026-11-03T12:00:00.000Z',
};

describe('ErrorResponseSchema', () => {
  it('accepts a valid response without details', () => {
    expect(ErrorResponseSchema.safeParse(validError).success).toBe(true);
  });

  it('accepts a valid response with details', () => {
    const withDetails = { ...validError, statusCode: 400, details: ['email must be an email'] };
    expect(ErrorResponseSchema.safeParse(withDetails).success).toBe(true);
  });

  it('accepts the boundary status codes 400 and 599', () => {
    expect(ErrorResponseSchema.safeParse({ ...validError, statusCode: 400 }).success).toBe(true);
    expect(ErrorResponseSchema.safeParse({ ...validError, statusCode: 599 }).success).toBe(true);
  });

  it('rejects a status code outside 400..599', () => {
    expect(ErrorResponseSchema.safeParse({ ...validError, statusCode: 200 }).success).toBe(false);
    expect(ErrorResponseSchema.safeParse({ ...validError, statusCode: 600 }).success).toBe(false);
  });

  it('rejects a fractional status code', () => {
    expect(ErrorResponseSchema.safeParse({ ...validError, statusCode: 404.5 }).success).toBe(false);
  });

  it('rejects non-string details', () => {
    expect(ErrorResponseSchema.safeParse({ ...validError, details: [42] }).success).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    expect(ErrorResponseSchema.safeParse({ ...validError, timestamp: 'yesterday' }).success).toBe(
      false,
    );
  });
});
