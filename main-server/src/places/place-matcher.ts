/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { toPlaceDto } from './dto/place.dto.js';
import { CuratedGroups } from './place-groups.js';
import { PlaceIndex, type PlaceMatch } from './place-index.js';

// The index over the Places of the database, read once when the server starts, as PlaceLookup reads them: the seed is
// loaded before the server starts, and a query is answered without a database query.
@Injectable()
export class PlaceMatcher implements OnModuleInit {
  private index = new PlaceIndex([], []);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    const places = (await this.prisma.place.findMany()).map((place) => toPlaceDto(place));
    this.index = new PlaceIndex(places, [new CuratedGroups(places)]);
  }

  match(words: string, userId: string): PlaceMatch {
    return this.index.match(words, userId);
  }
}
