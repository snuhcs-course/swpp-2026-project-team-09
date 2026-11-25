/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { CLOCK, systemClock } from '../quests/clock.js';
import { CrashAlertsService, FETCH_SLACK } from './crash-alerts.service.js';
import { SentryAlertsController } from './sentry-alerts.controller.js';

@Module({
  controllers: [SentryAlertsController],
  providers: [CrashAlertsService, { provide: FETCH_SLACK, useValue: fetch }, { provide: CLOCK, useValue: systemClock }],
})
export class SentryAlertsModule {}
