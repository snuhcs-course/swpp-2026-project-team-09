/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { AdminGlobalEventsController } from './admin-global-events.controller.js';
import { GlobalEventsController } from './global-events.controller.js';
import { GlobalEventsService } from './global-events.service.js';

@Module({
  imports: [CollectionModule, PlacesModule, QuestsModule],
  controllers: [GlobalEventsController, AdminGlobalEventsController],
  providers: [GlobalEventsService],
})
export class GlobalEventsModule {}
