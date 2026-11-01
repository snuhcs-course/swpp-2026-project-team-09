/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { EventCollector } from './event.collector.js';
import { ExtraSnuCollector } from './extra-snu.collector.js';

@Module({
  providers: [EventCollector, ExtraSnuCollector],
})
export class EventModule {}
