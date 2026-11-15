/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { TopicsStep } from './topics-step.service.js';

// Runs the topics step every TOPICS_TICK_SECONDS; 0 runs it never.
@Injectable()
export class TopicsTimer implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private readonly seconds: number;

  constructor(
    private readonly step: TopicsStep,
    settings: ConfigService<Settings, true>,
  ) {
    this.seconds = settings.get('TOPICS_TICK_SECONDS', { infer: true });
  }

  onModuleInit(): void {
    if (this.seconds > 0) {
      this.timer = setInterval(() => void this.step.run(), this.seconds * 1000).unref();
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }
}
