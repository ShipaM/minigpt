import { describe, expect, it } from 'vitest';
import { UserResponseSchema } from './users.ts';

const validUser = {
  id: '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c',
  email: 'user@example.com',
  displayName: 'Alice',
  createdAt: '2026-11-03T12:00:00.000Z',
};

describe('UserResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(UserResponseSchema.safeParse(validUser).success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    expect(UserResponseSchema.safeParse({ ...validUser, id: '123' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(UserResponseSchema.safeParse({ ...validUser, email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('rejects an empty displayName', () => {
    expect(UserResponseSchema.safeParse({ ...validUser, displayName: '' }).success).toBe(false);
  });

  it('rejects a non-ISO createdAt', () => {
    expect(UserResponseSchema.safeParse({ ...validUser, createdAt: '03.11.2026' }).success).toBe(
      false,
    );
  });

  it('rejects a missing field', () => {
    expect(UserResponseSchema.safeParse({ ...validUser, email: undefined }).success).toBe(false);
  });
});
