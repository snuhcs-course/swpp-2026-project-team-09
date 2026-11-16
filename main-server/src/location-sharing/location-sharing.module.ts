/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { PlacesModule } from '../places/places.module.js';
import { UsersModule } from '../users/users.module.js';
import { LocationSharingController } from './location-sharing.controller.js';
import { LocationSharingService } from './location-sharing.service.js';
import { PositionStore } from './position-store.js';
import { PrivateZonesController } from './private-zones.controller.js';
import { PrivateZonesService } from './private-zones.service.js';
import { VisibilityService } from './visibility.service.js';

@Module({
  imports: [PlacesModule, UsersModule],
  controllers: [LocationSharingController, PrivateZonesController],
  providers: [LocationSharingService, PositionStore, PrivateZonesService, VisibilityService],
  exports: [LocationSharingService, VisibilityService],
})
export class LocationSharingModule {}
