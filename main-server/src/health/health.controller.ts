import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MicroserviceHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { MessagingConfigService } from '../common/messaging-config.service.js';
import { PrismaService } from '../common/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly databaseHealth: PrismaHealthIndicator,
    private readonly redisHealth: MicroserviceHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly messagingConfig: MessagingConfigService,
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
      () => this.redisHealth.pingCheck('redis', this.messagingConfig.createClientOptions()),
    ]);
  }
}
