// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-04, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #6 #7 #31
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HealthIndicatorService } from '@nestjs/terminus';
import { MainServer } from '../common/main-server.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly mainServer: MainServer,
  ) {}

  @Get('live')
  @HealthCheck()
  live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  // Not ready while the main server, which takes what the worker collects, cannot be reached.
  @Get('ready')
  @HealthCheck()
  ready(): Promise<HealthCheckResult> {
    return this.health.check([
      async () => {
        const mainServer = this.indicator.check('mainServer');
        return (await this.mainServer.isLive()) ? mainServer.up() : mainServer.down();
      },
    ]);
  }
}
