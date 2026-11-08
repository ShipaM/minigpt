import { InternalServerErrorException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorResponseSchema, UserResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureApp } from '../../app.setup.ts';
import type { UserEntity } from './user.entity.ts';
import { UsersController } from './users.controller.ts';
import { UsersService } from './users.service.ts';

const USER_ID = '3f9e1c3a-6a2b-4c1d-9a55-0d6f4b7b2a10';
const now = new Date('2026-01-01T00:00:00.000Z');

const savedUser = (over: Partial<UserEntity> = {}): UserEntity => ({
  id: USER_ID,
  email: 'ivan@example.com',
  displayName: 'Ivan',
  createdAt: now,
  updatedAt: now,
  ...over,
});

describe('UsersController: validation and error format (no database)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const service = { createUser: vi.fn(), getUserById: vi.fn(), getAllUsers: vi.fn() };

  const postUser = (body: unknown) =>
    fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
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

  it('201 and normalization: email lower-cased, spaces trimmed', async () => {
    service.createUser.mockResolvedValue(savedUser());

    const res = await postUser({ email: '  Ivan@Example.COM ', displayName: '  Ivan  ' });

    expect(res.status).toBe(201);
    expect(service.createUser).toHaveBeenCalledWith({
      email: 'ivan@example.com',
      displayName: 'Ivan',
    });
    expect(UserResponseSchema.safeParse(await res.json()).success).toBe(true);
  });

  it('does not expose internal entity fields', async () => {
    service.createUser.mockResolvedValue(savedUser());

    const res = await postUser({ email: 'ivan@example.com', displayName: 'Ivan' });
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(body).not.toHaveProperty('updatedAt');
    expect(Object.keys(body).sort()).toEqual(['createdAt', 'displayName', 'email', 'id']);
  });

  it('400 on extra fields (mass assignment) and the service is not called', async () => {
    const res = await postUser({
      email: 'ivan@example.com',
      displayName: 'Ivan',
      id: 'forced-id',
      isAdmin: true,
    });
    const body = ErrorResponseSchema.parse(await res.json());

    expect(res.status).toBe(400);
    expect(body.details).toEqual(
      expect.arrayContaining(['property id should not exist', 'property isAdmin should not exist']),
    );
    expect(service.createUser).not.toHaveBeenCalled();
  });

  it('400 on invalid email and empty name, lists the problems', async () => {
    const res = await postUser({ email: 'not-an-email', displayName: '   ' });
    const body = ErrorResponseSchema.parse(await res.json());

    expect(res.status).toBe(400);
    expect(body.message).toBe('Validation failed');
    expect(body.details).toEqual(
      expect.arrayContaining([
        expect.stringContaining('email'),
        expect.stringContaining('displayName'),
      ]),
    );
  });

  it('GET /users returns the list mapped to the contract', async () => {
    const second = savedUser({
      id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
      email: 'b@example.com',
    });
    service.getAllUsers.mockResolvedValue([savedUser(), second]);

    const res = await fetch(`${baseUrl}/users`);
    const body = (await res.json()) as Record<string, unknown>[];

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(UserResponseSchema.array().safeParse(body).success).toBe(true);
    expect(body.every((u) => !('updatedAt' in u))).toBe(true);
  });

  it('GET /users returns an empty array when there are no users', async () => {
    service.getAllUsers.mockResolvedValue([]);

    const res = await fetch(`${baseUrl}/users`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
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
});
