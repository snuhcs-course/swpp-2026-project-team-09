/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { NotificationSender } from './notification-sender.js';
import { NotificationTicker } from './notification-ticker.js';
import { NotificationsModule } from './notifications.module.js';

// Apart from NotificationsModule, which QuestsModule imports: the sender reads the Quests' clock.
@Module({
  imports: [QuestsModule, NotificationsModule, PushModule],
  providers: [NotificationSender, NotificationTicker],
  exports: [NotificationSender],
})
export class NotificationSenderModule {}
