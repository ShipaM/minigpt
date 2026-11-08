import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.ts';
import type { CreateUserDto } from './create-user.dto.ts';

/** Postgres error code: unique constraint violation. */
const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async getAllUsers() {
    return this.users.find({ order: { createdAt: 'ASC' } });
  }

  async createUser(dto: CreateUserDto): Promise<UserEntity> {
    try {
      // Uniqueness is guaranteed by the database (not by "check first, insert later"): no races.
      const user = this.users.create(dto);

      return await this.users.save(user);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A user with this email already exists');
      }
      throw err;
    }
  }

  async getUserById(id: string): Promise<UserEntity> {
    const user = await this.users.findOneBy({ id });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}

function isUniqueViolation(err: unknown): boolean {
  const driverError = (err as { driverError?: { code?: string } } | null)?.driverError;

  return driverError?.code === PG_UNIQUE_VIOLATION;
}
