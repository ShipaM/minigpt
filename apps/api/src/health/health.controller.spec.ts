import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthResponseSchema } from '@minigpt/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.ts';

describe('GET /health', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.listen(0);

    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds with 200 and a body matching the contract', async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(HealthResponseSchema.safeParse(await response.json()).success).toBe(true);
  });
});
