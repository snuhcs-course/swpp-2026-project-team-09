import { Module } from '@nestjs/common';
import { BuildingsModule } from '../buildings/buildings.module.js';
import { CollectionModule } from '../collection/collection.module.js';
import { GlobalEventsController } from './global-events.controller.js';
import { GlobalEventsService } from './global-events.service.js';

@Module({
  imports: [CollectionModule, BuildingsModule],
  controllers: [GlobalEventsController],
  providers: [GlobalEventsService],
})
export class GlobalEventsModule {}
