import { z } from 'zod';

// The value from .env.example: it is public, so it must not be accepted in production.
const PLACEHOLDER_JWT_SECRET = 'MUqVe/g5pu+rVTcmrECROHwF8zFSWiAlJkMgRJIy3jI=';

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Treat an empty `PORT=` as unset: otherwise coerce turns it into 0.
    PORT: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.coerce.number().int().min(1).max(65535).default(4000),
    ),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
    // An access token cannot be revoked, so it lives briefly (60 s .. 1 h, default 15 min).
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    // A refresh token is stored in the database and can be revoked, so it may live long.
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.JWT_ACCESS_SECRET !== PLACEHOLDER_JWT_SECRET,
    {
      path: ['JWT_ACCESS_SECRET'],
      message: 'JWT_ACCESS_SECRET must not be the .env.example value in production',
    },
  );

export type Env = z.infer<typeof EnvSchema>;

/** Validates environment variables. The app must fail at startup if they are missing. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
