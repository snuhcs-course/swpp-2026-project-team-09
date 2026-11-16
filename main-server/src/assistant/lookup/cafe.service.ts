/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { type Position } from '../../common/geometry.js';
import { readSeedFile, SEED_DIRECTORY } from '../../common/seed-directory.js';
import { type LocationMissing } from '../dto/answer.dto.js';
import { type Cafe, type CafeAnswer, cafeWay } from './cafe-way.js';
import { WayService } from './way.service.js';

const fileSchema = z.object({
  cafes: z.array(z.object({ id: z.string(), name: z.string().min(1), latitude: z.number(), longitude: z.number() })),
});

// The campus cafés of `seed/openstreetmap-cafes.json`, read once when the server starts, each tied to the Place it is
// in or the nearest within 150 m, as a way reads a location. One with no Place that near is left out.
@Injectable()
export class CafeLookupService implements OnModuleInit {
  private seeded: z.infer<typeof fileSchema>['cafes'] = [];

  constructor(private readonly ways: WayService) {}

  async onModuleInit(): Promise<void> {
    ({ cafes: this.seeded } = await readSeedFile(SEED_DIRECTORY, 'openstreetmap-cafes.json', fileSchema));
  }

  cafes(): Cafe[] {
    return this.seeded.flatMap(({ name, latitude, longitude }) => {
      const placeId = this.ways.placeIdAt({ latitude, longitude });
      return placeId === null ? [] : [{ name, placeId, at: { latitude, longitude } }];
    });
  }

  async find(
    userId: string,
    ask: { fromPlaceId: string | null; toPlaceId: string | null },
    at: { now: Date; location: Position | null; locationMissing: LocationMissing },
  ): Promise<CafeAnswer> {
    return cafeWay(await this.ways.argsFor(userId, { ...ask, by: null }, at), this.cafes());
  }
}
