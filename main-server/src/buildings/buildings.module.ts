import { Module } from '@nestjs/common';
import { BuildingLookup } from './building-lookup.js';
import { BuildingsController } from './buildings.controller.js';
import { BuildingsService } from './buildings.service.js';

@Module({
  controllers: [BuildingsController],
  providers: [BuildingsService, BuildingLookup],
  exports: [BuildingLookup],
})
export class BuildingsModule {}
