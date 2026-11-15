/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Model, MODEL_PORT, openRouterModel } from '../assistant/adapter.js';
import { type Settings } from '../common/settings.js';
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
  imports: [NotificationsModule, QuestsModule, UsersModule],
  controllers: [InterestsController],
  providers: [
    InterestsService,
    TopicsReader,
    TopicsStep,
    TopicsTimer,
    // The Assistant's model, bound here as GlobalEventsModule binds it, since AssistantModule imports this module.
    {
      provide: MODEL_PORT,
      inject: [ConfigService],
      useFactory: (settings: ConfigService<Settings, true>): Model =>
        openRouterModel(
          settings.get('OPENROUTER_API_KEY', { infer: true }),
          settings.get('ASSISTANT_MODEL', { infer: true }),
        ),
    },
  ],
  // The Assistant's watchInterest and unwatchInterest keep and remove through InterestsService.
  exports: [InterestsService],
})
export class InterestsModule {}
