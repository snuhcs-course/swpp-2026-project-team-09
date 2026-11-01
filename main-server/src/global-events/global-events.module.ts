/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Model, MODEL_PORT, openRouterModel } from '../assistant/adapter.js';
import { type Settings } from '../common/settings.js';
import { CollectionModule } from '../collection/collection.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { AdminGlobalEventsController } from './admin-global-events.controller.js';
import { CollectedPostsService } from './collected-posts.service.js';
import { GlobalEventsController } from './global-events.controller.js';
import { GlobalEventsService } from './global-events.service.js';
import { JudgementsService } from './judgements.service.js';
import { PublicationStepService } from './publication-step.service.js';

@Module({
  imports: [CollectionModule, PlacesModule, QuestsModule],
  controllers: [GlobalEventsController, AdminGlobalEventsController],
  providers: [
    GlobalEventsService,
    CollectedPostsService,
    JudgementsService,
    PublicationStepService,
    // The Assistant's model. AssistantModule imports this module, so this one binds the port itself.
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
  // The Assistant's searchGlobalEvents and showGlobalEvents read the published Global Events through it.
  // JudgementsService runs the step over one Draft for a later script and for the evaluation.
  exports: [GlobalEventsService, JudgementsService],
})
export class GlobalEventsModule {}
