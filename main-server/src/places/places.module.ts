/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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
