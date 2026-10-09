/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { MainServerGuard } from './common/main-server.guard.js';
import { PrismaModule } from './common/prisma.module.js';
import { settingsSchema } from './common/settings.js';
import { HealthModule } from './health/health.module.js';
import { MatchingModule } from './matching/matching.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Node loads the .env file (see the start scripts), so tests see only the settings they set.
      ignoreEnvFile: true,
      validationSchema: settingsSchema,
    }),
    // Holds the interval of the rounds, and clears it when the server stops.
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    MatchingModule,
  ],
  providers: [
    // Validates a handler parameter against the schema given in its decorator: @Body({ schema: askSchema }).
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    { provide: APP_GUARD, useClass: MainServerGuard },
  ],
})
export class AppModule {}
