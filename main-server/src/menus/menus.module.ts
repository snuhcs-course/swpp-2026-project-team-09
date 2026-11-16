/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { CollectionModule } from '../collection/collection.module.js';
import { PlacesModule } from '../places/places.module.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';
import { RestaurantHours } from './restaurant-hours.js';
import { RestaurantPlaces } from './restaurant-places.js';

@Module({
  imports: [CollectionModule, PlacesModule],
  controllers: [MenusController],
  providers: [MenusService, RestaurantPlaces, RestaurantHours],
  // The Assistant's tools read the menus through it, 공강에 밥 the Restaurants' Places, and a plan their hours.
  exports: [MenusService, RestaurantPlaces, RestaurantHours],
})
export class MenusModule {}
