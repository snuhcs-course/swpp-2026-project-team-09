/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { NotificationSender } from './notification-sender.js';

// Runs the sender's step every NOTIFICATIONS_TICK_SECONDS; 0 runs none, and the tests call the step themselves.
@Injectable()
export class NotificationTicker implements OnModuleInit, OnApplicationShutdown {
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly sender: NotificationSender,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  onModuleInit(): void {
    const seconds = this.settings.get('NOTIFICATIONS_TICK_SECONDS', { infer: true });
    if (seconds > 0) {
      this.timer = setInterval(() => void this.sender.sendDue(), seconds * 1000).unref();
    }
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }
}
