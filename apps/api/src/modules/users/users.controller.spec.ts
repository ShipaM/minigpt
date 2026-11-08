import {
  ForbiddenException,
  InternalServerErrorException,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ErrorResponseSchema, UserResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../app.setup.ts';
import type { UserEntity } from './user.entity.ts';
import { UsersController } from './users.controller.ts';
import { UsersService } from './users.service.ts';

const USER_ID = '3f9e1c3a-6a2b-4c1d-9a55-0d6f4b7b2a10';
const OTHER_ID = '8b1d2f44-0c3e-4f5a-8e21-6a7b9c0d1e2f';
const now = new Date('2026-01-01T00:00:00.000Z');
const savedUser = (over: Partial<UserEntity> = {}): UserEntity => ({
  id: USER_ID,
  email: 'ivan@example.com',
  displayName: 'Ivan',
  passwordHash: 'scrypt$secret-hash',
  createdAt: now,
  updatedAt: now,
  ...over,
});

describe('UsersController: access, validation and error format (no database)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const service = { getUserById: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: service },
        {
          // A stand-in for JwtAuthGuard: "the caller is already authenticated as USER_ID".
          provide: APP_GUARD,
          useValue: {
            canActivate: (context: ExecutionContext) => {
              context.switchToHttp().getRequest().user = { id: USER_ID };
              return true;
            },
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useLogger(false); // expected 500s do not clutter the output
    configureApp(app); // the same pipe and filter as in production
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns your own profile and does not expose internal entity fields', async () => {
    service.getUserById.mockResolvedValue(savedUser());
    const res = await fetch(`${baseUrl}/users/${USER_ID}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(UserResponseSchema.safeParse(body).success).toBe(true);
    expect(Object.keys(body).sort()).toEqual(['createdAt', 'displayName', 'email', 'id']);
    expect(JSON.stringify(body)).not.toContain('scrypt');
  });

  it("403 for somebody else's id and the service is not called", async () => {
    const res = await fetch(`${baseUrl}/users/${OTHER_ID}`);
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(await res.json()).success).toBe(true);
    expect(service.getUserById).not.toHaveBeenCalled();
  });

  it('400 when the id is not a UUID', async () => {
    const res = await fetch(`${baseUrl}/users/not-a-uuid`);
    expect(res.status).toBe(400);
    expect(ErrorResponseSchema.safeParse(await res.json()).success).toBe(true);
    expect(service.getUserById).not.toHaveBeenCalled();
  });

  it('500 does not reveal error internals', async () => {
    service.getUserById.mockRejectedValue(
      new Error('connection to 10.0.0.5:5432 refused, password=secret'),
    );
    const res = await fetch(`${baseUrl}/users/${USER_ID}`);
    const body = ErrorResponseSchema.parse(await res.json());
    expect(res.status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('keeps the status of an HttpException', async () => {
    service.getUserById.mockRejectedValue(new InternalServerErrorException('boom'));
    const res = await fetch(`${baseUrl}/users/${USER_ID}`);
    expect(res.status).toBe(500);
    expect(ErrorResponseSchema.safeParse(await res.json()).success).toBe(true);
  });

  it('a ForbiddenException from the service keeps its 403', async () => {
    service.getUserById.mockRejectedValue(new ForbiddenException('nope'));
    const res = await fetch(`${baseUrl}/users/${USER_ID}`);
    expect(res.status).toBe(403);
  });
});
