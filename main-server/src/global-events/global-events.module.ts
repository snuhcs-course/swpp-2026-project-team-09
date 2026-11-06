/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { MODEL_PORT_PROVIDER } from '../assistant/model-port.js';
import { CollectionModule } from '../collection/collection.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { AdminGlobalEventsController } from './admin-global-events.controller.js';
import { CollectedPostsService } from './collected-posts.service.js';
import { GlobalEventsController } from './global-events.controller.js';
import { GlobalEventsService } from './global-events.service.js';
import { JudgementsService } from './judgements.service.js';
import { PublicationStepService } from './publication-step.service.js';
import { SameEventChoicesService } from './same-event-choices.service.js';
import { SameEventQueueService } from './same-event-queue.service.js';

@Module({
  imports: [CollectionModule, PlacesModule, QuestsModule],
  controllers: [GlobalEventsController, AdminGlobalEventsController],
  providers: [
    GlobalEventsService,
    CollectedPostsService,
    JudgementsService,
    PublicationStepService,
    SameEventChoicesService,
    SameEventQueueService,
    // The Assistant's model. AssistantModule imports this module, so this one binds the port itself.
    MODEL_PORT_PROVIDER,
  ],
  // The Assistant's searchGlobalEvents and showGlobalEvents read the published Global Events through it.
  // JudgementsService runs the step over one Draft for a later script and for the evaluation.
  exports: [GlobalEventsService, JudgementsService],
})
export class GlobalEventsModule {}
