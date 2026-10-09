// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-04 to 2026-10-08, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #30
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
