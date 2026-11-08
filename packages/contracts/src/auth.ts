import { z } from 'zod';
import { UserResponseSchema } from './users.ts';

//Password rules shared by the API (DTO) and, later, by the web forms.
export const PASSWORD_MIN_LENGTH = 8;

// An upper bound protects the server: hashing a megabyte-long "password" would be a cheap attack.
export const PASSWORD_MAX_LENGTH = 128;

//Answer of register, login and refresh. The refresh token is NOT here: it travels in a cookie.
export const AuthResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: UserResponseSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
