import type { UserResponse } from '@minigpt/contracts';
import type { UserEntity } from './user.entity.ts';

/** Only public fields leave the API, not the whole database entity. */
export function toUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}
