import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MicroserviceHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/public.decorator.js';
import { messagingOptions } from '../common/messaging.js';
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
