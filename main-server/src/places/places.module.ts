// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-03 to 2026-10-08, prompted by fyoon46 and TaeHyun79, reviewed by TaeHyun79 and fyoon46 in #30 #32
import { Module } from '@nestjs/common';
import { AdminPlacesController } from './admin-places.controller.js';
import { PlaceLookup } from './place-lookup.js';
import { PlacesController } from './places.controller.js';
import { PlacesService } from './places.service.js';

@Module({
  controllers: [PlacesController, AdminPlacesController],
  providers: [PlacesService, PlaceLookup],
  exports: [PlacesService, PlaceLookup],
})
export class PlacesModule {}
