/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalAliases } from '../assistant/aliases/global-aliases.js';
import { PersonalAliases } from '../assistant/aliases/personal-aliases.js';
import { databaseCauseOf } from '../common/database-cause.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Settings } from '../common/settings.js';
import { type PlaceDto, toPlaceDto } from './dto/place.dto.js';
import { type CompiledRule, compileRules } from './induced-rules.js';
import { type PlaceAliases } from './place-aliases.js';
import { CuratedGroups } from './place-groups.js';
import { PlaceIndex, type PlaceMatch } from './place-index.js';

// How often each server looks for induced rules another server's induction wrote (P07 ticket 07).
const REFRESH_MS = 60 * 1000;

interface ActiveRow {
  id: string;
  kind: 'name' | 'words';
  pattern: string;
  replace: string;
  updatedAt: Date;
}

// The index over the Places of the database, read once when the server starts, as PlaceLookup reads them: the seed is
// loaded before the server starts. Its aliases are asked in order: the User's own, everyone's, then the curated
// groups. Only the learned aliases are read from the database on each query. A second index without the learned
// aliases gives the rules' own reading of words, the source of the alias chain (P07 ticket 06). Both hold the induced
// rules (ticket 07), read when the server starts, after an induction on this server, and each minute for one elsewhere.
@Injectable()
export class PlaceMatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlaceMatcher.name);
  private index = new PlaceIndex([], []);
  private rules = new PlaceIndex([], []);
  private places: PlaceDto[] = [];
  private sources: PlaceAliases[] = [];
  private curated: PlaceAliases[] = [];
  private active: CompiledRule[] = [];
  private version = '';
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.places = (await this.prisma.place.findMany()).map((place) => toPlaceDto(place));
    const global = new GlobalAliases(this.prisma, {
      enabled: this.settings.get('ASSISTANT_GLOBAL_ALIASES', { infer: true }),
      holdbackPercent: this.settings.get('ASSISTANT_ALIAS_HOLDBACK_PERCENT', { infer: true }),
    });
    const curated = new CuratedGroups(this.places);
    this.sources = [new PersonalAliases(this.prisma), global, curated];
    this.curated = [curated];
    await this.reload();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }

  match(words: string, userId: string): Promise<PlaceMatch> {
    return this.index.match(words, userId);
  }

  // The reading by the rules alone: the exact names and numbers, the curated groups, the short forms, the induced
  // rules and the looser tiers, with nothing anyone taught.
  byRule(words: string): Promise<PlaceMatch> {
    return this.rules.match(words, '');
  }

  // The active induced rules read again and both indexes built over them. A row the language refuses is left out and
  // logged.
  async reload(): Promise<void> {
    const rows = await this.activeRows();
    const { rules, refused } = compileRules(rows);
    for (const { id, refusal } of refused) {
      this.logger.warn(`Induced rule ${id} is left out: ${refusal}`);
    }
    this.version = versionOf(rows);
    this.active = rules;
    this.index = new PlaceIndex(this.places, this.sources, {
      rules,
      holdbackPercent: this.settings.get('ASSISTANT_ALIAS_HOLDBACK_PERCENT', { infer: true }),
    });
    this.rules = new PlaceIndex(this.places, this.curated, { rules, holdbackPercent: 0 });
  }

  // The rules in force, oldest first, for the induction to build on.
  activeRules(): CompiledRule[] {
    return [...this.active];
  }

  private activeRows(): Promise<ActiveRow[]> {
    if (!this.settings.get('ASSISTANT_INDUCED_RULES', { infer: true })) {
      return Promise.resolve([]);
    }
    return this.prisma.inducedRule.findMany({
      where: { retiredAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, kind: true, pattern: true, replace: true, updatedAt: true },
    });
  }

  private async refresh(): Promise<void> {
    try {
      if (versionOf(await this.activeRows()) !== this.version) {
        await this.reload();
      }
    } catch (error) {
      this.logger.warn(`The induced rules were not read again: ${databaseCauseOf(error)}`);
    }
  }
}

// What tells one set of active rows from another: their ids and when each was last written.
function versionOf(rows: readonly { id: string; updatedAt: Date }[]): string {
  return rows.map(({ id, updatedAt }) => `${id}@${updatedAt.getTime()}`).join(',');
}
