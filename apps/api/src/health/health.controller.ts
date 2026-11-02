import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@minigpt/contracts';

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
  }
}
