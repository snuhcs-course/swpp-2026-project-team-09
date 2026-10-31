/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
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
// groups. Only the learned aliases are read from the database on each query. A second index without the learned
// aliases gives the rules' own reading of words, the source of the alias chain (P07 ticket 06).
@Injectable()
export class PlaceMatcher implements OnModuleInit {
  private index = new PlaceIndex([], []);
  private rules = new PlaceIndex([], []);

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
    const curated = new CuratedGroups(places);
    this.index = new PlaceIndex(places, [new PersonalAliases(this.prisma), global, curated]);
    this.rules = new PlaceIndex(places, [curated]);
  }

  match(words: string, userId: string): Promise<PlaceMatch> {
    return this.index.match(words, userId);
  }

  // The reading by the rules alone: the exact names and numbers, the curated groups, the short forms and the looser
  // tiers, with nothing anyone taught.
  byRule(words: string): Promise<PlaceMatch> {
    return this.rules.match(words, '');
  }
}
