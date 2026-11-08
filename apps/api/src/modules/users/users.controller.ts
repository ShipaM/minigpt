import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { UserResponse } from '@minigpt/contracts';
import type { UserEntity } from './user.entity.ts';
import { UsersService } from './users.service.ts';
// A value import, not `import type`: ValidationPipe needs the class at runtime (design:paramtypes).
import { CreateUserDto } from './create-user.dto.ts';

//Only public fields leave the API, not the whole database entity.
export function toUserResponse(user: UserEntity): UserResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return toUserResponse(await this.users.createUser(dto));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(): Promise<UserResponse[]> {
    return (await this.users.getAllUsers()).map(toUserResponse);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getById(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserResponse> {
    return toUserResponse(await this.users.getUserById(id));
  }
}
