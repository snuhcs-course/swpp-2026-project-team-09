/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { readSeedFile, SEED_DIRECTORY } from '../common/seed-directory.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';

const fileSchema = z.object({ restaurants: z.record(z.string().min(1), z.string().min(1)) });

// Which Place each Restaurant stands at, from `seed/restaurant-places.json`, read once when the server starts. A
// Restaurant's key is its name as `GET /menus` gives it. One the seed does not hold has no Place.
@Injectable()
export class RestaurantPlaces implements OnModuleInit {
  private numbers = new Map<string, string>();

  constructor(private readonly places: PlaceLookup) {}

  async onModuleInit(): Promise<void> {
    const { restaurants } = await readSeedFile(SEED_DIRECTORY, 'restaurant-places.json', fileSchema);
    this.numbers = new Map(Object.entries(restaurants));
  }

  placeOf(restaurant: string): PlaceDto | null {
    const number = this.numbers.get(restaurant);
    return number === undefined ? null : this.places.numbered(number);
  }
}
