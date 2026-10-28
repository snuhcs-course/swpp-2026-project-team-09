/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalAliases } from '../assistant/aliases/global-aliases.js';
import { PersonalAliases } from '../assistant/aliases/personal-aliases.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Settings } from '../common/settings.js';
import { toPlaceDto } from './dto/place.dto.js';
import { CuratedGroups } from './place-groups.js';
import { PlaceIndex, type PlaceMatch } from './place-index.js';

// The index over the Places of the database, read once when the server starts, as PlaceLookup reads them: the seed is
// loaded before the server starts. Its aliases are asked in order: the User's own, everyone's, then the curated
// groups. Only the learned aliases are read from the database on each query.
@Injectable()
export class PlaceMatcher implements OnModuleInit {
  private index = new PlaceIndex([], []);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const places = (await this.prisma.place.findMany()).map((place) => toPlaceDto(place));
    const global = new GlobalAliases(this.prisma, {
      enabled: this.settings.get('ASSISTANT_GLOBAL_ALIASES', { infer: true }),
      holdbackPercent: this.settings.get('ASSISTANT_ALIAS_HOLDBACK_PERCENT', { infer: true }),
    });
    this.index = new PlaceIndex(places, [new PersonalAliases(this.prisma), global, new CuratedGroups(places)]);
  }

  match(words: string, userId: string): Promise<PlaceMatch> {
    return this.index.match(words, userId);
  }
}
