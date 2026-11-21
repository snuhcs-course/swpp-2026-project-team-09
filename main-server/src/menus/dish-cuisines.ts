/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { causeOf, type Model } from '../assistant/adapter.js';
import { ModelPort } from '../assistant/model-port.js';
import { type Settings } from '../common/settings.js';
import { PrismaService } from '../common/prisma.service.js';
import { type CuisineLimits, readCuisines } from './cuisine-reading.js';
import { CUISINE_WORDS, type CuisineWord } from './cuisine-words.js';

// The most names one call reads: a week's new dishes take a few calls at first, and none once their names are kept.
const NAMES_PER_CALL = 100;

// Keeps the kind of food of each dish name, read once by the model with the key llm.key names when a collected menu
// first holds the name, so that no request asks the model for it. A name the model failed to answer stays unread and is
// read again with the next collection.
@Injectable()
export class DishCuisines {
  private readonly logger = new Logger(DishCuisines.name);
  private readonly limits: CuisineLimits;
  // DISH_CUISINES: off reads nothing, and every dish stays without a kind.
  private readonly on: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly models: ModelPort,
    settings: ConfigService<Settings, true>,
  ) {
    this.on = settings.get('DISH_CUISINES', { infer: true });
    this.limits = {
      timeoutMs: settings.get('ASSISTANT_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('ASSISTANT_MAX_OUTPUT_TOKENS', { infer: true }),
    };
  }

  // Reads the names no row holds yet and keeps those answered. It never throws: no key, a failed call, or an answer of
  // another shape keeps nothing.
  async readNew(names: readonly string[]): Promise<void> {
    if (!this.on) {
      return;
    }
    const unread = await this.unread(names);
    const chosen = this.models.chosen();
    if (unread.length === 0 || chosen === null) {
      return;
    }
    const parts = Array.from({ length: Math.ceil(unread.length / NAMES_PER_CALL) }, (_, index) =>
      unread.slice(index * NAMES_PER_CALL, (index + 1) * NAMES_PER_CALL),
    );
    await Promise.all(parts.map((part) => this.keep(chosen.model, part)));
  }

  // The names no row holds yet; none when they cannot be read.
  private async unread(names: readonly string[]): Promise<string[]> {
    const asked = [...new Set(names)].filter((name) => name !== '');
    try {
      const kept = await this.prisma.dishCuisine.findMany({ where: { name: { in: asked } }, select: { name: true } });
      const known = new Set(kept.map(({ name }) => name));
      return asked.filter((name) => !known.has(name));
    } catch (error) {
      this.logger.warn(`Reading the kept kinds of food failed: ${causeOf(error)}`);
      return [];
    }
  }

  private async keep(model: Model, names: readonly string[]): Promise<void> {
    try {
      const read = await readCuisines(model, names, this.limits);
      await this.prisma.dishCuisine.createMany({
        data: [...read].map(([name, cuisine]) => ({ name, cuisine })),
        skipDuplicates: true,
      });
    } catch (error) {
      this.logger.warn(`Reading the kinds of food of ${names.length} dishes failed: ${causeOf(error)}`);
    }
  }

  // The kept kind of food of each name read, null for none; a name not read yet is not in the map.
  async of(names: readonly string[]): Promise<Map<string, CuisineWord | null>> {
    const rows = await this.prisma.dishCuisine.findMany({ where: { name: { in: [...new Set(names)] } } });
    return new Map(rows.map(({ name, cuisine }) => [name, cuisine === null ? null : CUISINE_WORDS[cuisine]]));
  }
}
