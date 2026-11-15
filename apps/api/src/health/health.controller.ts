import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@minigpt/contracts';
import { Public } from '../modules/auth/public.decorator.ts';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
