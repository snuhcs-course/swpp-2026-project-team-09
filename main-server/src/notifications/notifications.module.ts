/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { NotificationStore } from './notification-store.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationStore],
  exports: [NotificationsService],
})
export class NotificationsModule {}
