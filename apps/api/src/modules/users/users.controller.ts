import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { UserResponse } from '@minigpt/contracts';
import { UsersService } from './users.service.ts';

// A value import, not `import type`: ValidationPipe needs the class at runtime (design:paramtypes).
import { toUserResponse } from './user.mapper.ts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.ts';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  async getById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() current: AuthenticatedUser,
  ): Promise<UserResponse> {
    // "Who are you" is not enough: you may read only your own profile (protection from IDOR, id guessing).
    // The same 403 for an existing and a non-existing id: the answer does not reveal who is registered.
    if (id !== current.id) throw new ForbiddenException('You can only access your own profile');
    return toUserResponse(await this.users.getUserById(id));
  }
}
