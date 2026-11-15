/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ModelPortModule } from '../assistant/model-port.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { InterestsController } from './interests.controller.js';
import { InterestsService } from './interests.service.js';
import { TopicsReader } from './topics-reader.js';
import { TopicsStep } from './topics-step.service.js';
import { TopicsTimer } from './topics-timer.js';

@Module({
  // QuestsModule gives the clock and the recruiting list.
  imports: [ModelPortModule, NotificationsModule, QuestsModule, UsersModule],
  controllers: [InterestsController],
  providers: [InterestsService, TopicsReader, TopicsStep, TopicsTimer],
  // The Assistant's watchInterest and unwatchInterest keep and remove through InterestsService.
  exports: [InterestsService],
})
export class InterestsModule {}
