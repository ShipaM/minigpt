import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './cursor.ts';

const cursor = {
  updatedAt: '2026-01-01T10:00:00.123Z',
  id: '3f9e1c3a-6a2b-4c1d-9a55-0d6f4b7b2a10',
};

describe('chat cursor', () => {
  it('survives a round trip and is URL-safe', () => {
    const raw = encodeCursor(cursor);

    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(raw)).toEqual(cursor);
  });

  it('returns null for garbage, for valid JSON of the wrong shape, and for an empty string', () => {
    const wrongShape = Buffer.from(JSON.stringify({ updatedAt: 'yesterday', id: 1 })).toString(
      'base64url',
    );

    const injection = Buffer.from(
      JSON.stringify({ ...cursor, id: "x'; DROP TABLE chats;--" }),
    ).toString('base64url');

    for (const bad of ['', 'not a cursor', '%%%', wrongShape, injection]) {
      expect(decodeCursor(bad)).toBeNull();
    }
  });
});
