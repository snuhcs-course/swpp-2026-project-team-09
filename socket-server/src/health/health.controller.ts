// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #6
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheck, HealthCheckResult, HealthCheckService, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { messagingOptions } from '../common/messaging.js';
import { Settings } from '../common/settings.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly redisHealth: MicroserviceHealthIndicator,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  // Not ready while Redis cannot be reached.
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redisHealth.pingCheck('redis', messagingOptions(this.settings))]);
  }
}
