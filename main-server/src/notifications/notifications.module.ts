/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { CLOCK, systemClock } from '../quests/clock.js';
import { NotificationStore } from './notification-store.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  // The Quests' clock, the same object, which QuestsModule cannot give: it imports this module.
  providers: [NotificationsService, NotificationStore, { provide: CLOCK, useValue: systemClock }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
