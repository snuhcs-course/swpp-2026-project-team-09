/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';

// The gold set of `pnpm eval:replay` (research note 08 §4): words students write for campus Places, each with the
// Places it may mean, the day it was collected and its set. The development set tunes the rules; the test set,
// collected later from students who were shown no official names, is the one reported.

export const GOLD_FILE = new URL('../gold/places.yaml', import.meta.url);

export const GOLD_SETS = ['development', 'test'] as const;

export type GoldSet = (typeof GOLD_SETS)[number];

// A Place by its seed name, or by its number, which YAML reads as a number when it is all digits.
const targetSchema = z.union([z.string().trim().min(1), z.int().nonnegative().transform(String)]);

export const goldItemSchema = z
  .strictObject({
    words: z.string().trim().min(1).max(50),
    // Every Place the words may mean; empty for words that name no Place.
    accept: z.array(targetSchema),
    collected: z.iso.date(),
    set: z.enum(GOLD_SETS),
    note: z.string().min(1).optional(),
    // A knowledge update (research note 10 §5): the item holds from the first day, and before the second, in Korea. Two
    // items of the same words, one until a day and one from it, say that the Places the words mean changed that day,
    // and a run at several --as-of days shows when stage C follows.
    from: z.iso.date().optional(),
    until: z.iso.date().optional(),
  })
  .refine(({ from, until }) => from === undefined || until === undefined || from < until, {
    path: ['until'],
    message: 'until must come after from',
  });

export type GoldItem = z.infer<typeof goldItemSchema>;

export const goldFileSchema = z.array(goldItemSchema).min(1);

export function loadGold(file: string | URL = GOLD_FILE): GoldItem[] {
  return goldFileSchema.parse(parse(readFileSync(file, 'utf8')));
}

// The items of one set: the test set unless the development set is asked for, never both in one score.
export function itemsOf(items: readonly GoldItem[], set: GoldSet): GoldItem[] {
  const chosen = items.filter((item) => item.set === set);
  if (chosen.length === 0) {
    throw new Error(
      set === 'test'
        ? 'The gold file has no test items yet: pass --development to score the development set.'
        : 'The gold file has no development items.',
    );
  }
  return chosen;
}

// The first moment of a day in Korea.
function koreaDayStart(day: string): Date {
  return new Date(`${day}T00:00:00+09:00`);
}

// The items that hold at a time: those without a window, and those whose window holds it.
export function activeAt(items: readonly GoldItem[], asOf: Date): GoldItem[] {
  return items.filter(
    ({ from, until }) =>
      (from === undefined || koreaDayStart(from).getTime() <= asOf.getTime()) &&
      (until === undefined || asOf.getTime() < koreaDayStart(until).getTime()),
  );
}

// How many items hold only from or until a day: the knowledge updates of the set.
export function updatesOf(items: readonly GoldItem[]): number {
  return items.filter(({ from, until }) => from !== undefined || until !== undefined).length;
}

// The fingerprint of a set, the first 12 hex digits of the SHA-256 of its items' words, targets, days and windows in a
// fixed order: the same whatever the order and the notes of the file, different once an item changes. The test set is
// frozen before any rule or group table is tuned on it, its fingerprint recorded, and a later run must show the same
// one, or it scores another set (research note 10 §3).
export function fingerprintOf(items: readonly GoldItem[]): string {
  const canonical = items
    .map(({ words, accept, collected, set, from, until }) => ({
      words,
      accept: accept.toSorted(),
      collected,
      set,
      from: from ?? null,
      until: until ?? null,
    }))
    .toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 12);
}

// The ids of the Places each item accepts: every Place of that exact name, else every Place of that number. Targets
// that name no Place fail, all of them in one error, so that a typo is never scored as a wrong answer.
export function acceptedIds(items: readonly GoldItem[], places: readonly PlaceDto[]): Set<string>[] {
  const unknown: string[] = [];
  const accepted = items.map((item) => {
    const ids = new Set<string>();
    for (const target of item.accept) {
      const named = places.filter(({ name }) => name === target);
      const found = named.length > 0 ? named : places.filter(({ number }) => number === target);
      if (found.length === 0) {
        unknown.push(`${item.words}: no Place is named or numbered ${target}`);
      }
      for (const { id } of found) {
        ids.add(id);
      }
    }
    return ids;
  });
  if (unknown.length > 0) {
    throw new Error(`The gold file names Places the catalog lacks:\n${unknown.join('\n')}`);
  }
  return accepted;
}
