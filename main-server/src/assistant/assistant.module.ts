/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { GlobalEventsModule } from '../global-events/global-events.module.js';
import { MenusModule } from '../menus/menus.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { ShuttleModule } from '../shuttle/shuttle.module.js';
import { type Model, MODEL_PORT, openRouterModel } from './adapter.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  // QuestsModule gives the clock, by which a message falls in its day, and the recruiting list.
  imports: [GlobalEventsModule, MenusModule, QuestsModule, ShuttleModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
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
})
export class AssistantModule {}
