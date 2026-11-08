import { z } from 'zod';

export const UserResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export type UserResponse = z.infer<typeof UserResponseSchema>;
