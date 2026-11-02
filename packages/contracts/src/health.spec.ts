import { describe, expect, it } from 'vitest';
import { HealthResponseSchema } from './health.ts';

describe('HealthResponseSchema', () => {
  it('accepts a valid response', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ok', uptimeSeconds: 12 }).success).toBe(true);
  });

  it('rejects an invalid status and a negative uptime', () => {
    expect(HealthResponseSchema.safeParse({ status: 'down', uptimeSeconds: 1 }).success).toBe(
      false,
    );
    expect(HealthResponseSchema.safeParse({ status: 'ok', uptimeSeconds: -1 }).success).toBe(false);
  });

  it('rejects a fractional uptime', () => {
    expect(HealthResponseSchema.safeParse({ status: 'ok', uptimeSeconds: 1.5 }).success).toBe(
      false,
    );
  });
});
