/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { MainServerModule } from './common/main-server.module.js';
import { PageFetcherModule } from './common/page-fetcher.module.js';
import { settingsSchema } from './common/settings.js';
import { EventModule } from './event/event.module.js';
import { HealthModule } from './health/health.module.js';
import { MenuModule } from './menu/menu.module.js';
import { ShuttleModule } from './shuttle/shuttle.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    // Runs the methods marked @Cron(), which start the Collections.
    ScheduleModule.forRoot(),
    // Lets `pnpm collect` find the collector of each Source it names (src/collect-sources.ts).
    DiscoveryModule,
    MainServerModule,
    PageFetcherModule,
    HealthModule,
    MenuModule,
    ShuttleModule,
    EventModule,
  ],
})
export class AppModule {}
