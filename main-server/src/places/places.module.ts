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
