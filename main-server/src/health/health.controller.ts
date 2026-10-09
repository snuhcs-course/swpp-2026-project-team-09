// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #2 #4 #5
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MicroserviceHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { messagingOptions } from '../common/messaging.js';
import { Public } from '../common/public.decorator.js';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';

// Open without an access token, so that anyone can tell whether the server is up.
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealth: PrismaHealthIndicator,
    private readonly redisHealth: MicroserviceHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  // Not ready while the database or Redis cannot be reached.
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.databaseHealth.pingCheck('database', this.prisma),
      () => this.redisHealth.pingCheck('redis', messagingOptions(this.settings)),
    ]);
  }
}
