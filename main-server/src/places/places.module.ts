import { Module } from '@nestjs/common';
import { PlaceLookup } from './place-lookup.js';
import { PlacesController } from './places.controller.js';
import { PlacesService } from './places.service.js';

@Module({
  controllers: [PlacesController],
  providers: [PlacesService, PlaceLookup],
  exports: [PlaceLookup],
})
export class PlacesModule {}
