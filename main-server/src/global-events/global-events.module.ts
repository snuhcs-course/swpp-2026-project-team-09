import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { PlacesModule } from '../places/places.module.js';
import { GlobalEventsController } from './global-events.controller.js';
import { GlobalEventsService } from './global-events.service.js';

@Module({
  imports: [CollectionModule, PlacesModule],
  controllers: [GlobalEventsController],
  providers: [GlobalEventsService],
})
export class GlobalEventsModule {}
