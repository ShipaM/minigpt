import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity.ts';

/** Postgres error code: unique constraint violation. */
const PG_UNIQUE_VIOLATION = '23505';

export interface NewUser {
  email: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async createUser(user: NewUser): Promise<UserEntity> {
    try {
      // Uniqueness is guaranteed by the database (not by "check first, insert later"): no races.
      const newUser = this.users.create(user);

      return await this.users.save(newUser);
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

  //For login only: this is the one place that loads the password hash (it is `select: false`).
  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }
}

function isUniqueViolation(err: unknown): boolean {
  const driverError = (err as { driverError?: { code?: string } } | null)?.driverError;

  return driverError?.code === PG_UNIQUE_VIOLATION;
}
