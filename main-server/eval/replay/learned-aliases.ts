/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { qualifies, scoreOf, topOf } from '../../src/assistant/aliases/alias-rules.js';
import { standingsOf } from '../../src/assistant/aliases/alias-standings.js';
import { heldBack } from '../../src/common/holdback.js';
import { normaliseWords } from '../../src/common/normalise-words.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type AliasHit, type PlaceAliases } from '../../src/places/place-aliases.js';

// Stage C's aliases (P07 ticket 05): the Place aliases the server would have held at a time, rebuilt from the
// resolution_events before it by ticket 03's rules, and kept in memory as alias sources; nothing is written. Aliases a
// User deleted from their list leave no event, so the replay still counts them.

export interface AliasWindow {
  // Only rows before it teach.
  before: Date;
  // Rows that never teach: the labels a learning curve scores.
  excluding: readonly string[];
  // The words, as written, whose everyone's aliases are rebuilt: those the replay will ask.
  words: readonly string[];
  // ASSISTANT_ALIAS_HOLDBACK_PERCENT: the share of accounts everyone's aliases never answer.
  holdbackPercent: number;
}

export interface LearnedAliases {
  personal: PlaceAliases;
  global: PlaceAliases;
  // How many (User, words, Place) personal aliases and words with everyone's alias were rebuilt.
  personalCount: number;
  globalCount: number;
}

const LABELS = ['chosen', 'edited', 'rejected'] as const;

function key(userId: string, words: string): string {
  return `${userId} ${words}`;
}

// Each User's own aliases as AliasesService.learn and reject leave them: a choice or an edit adds its Place for the
// words, a rejection removes it, in the order they happened. An edit with no words teaches nothing.
async function personalAliases(
  prisma: PrismaClient,
  { before, excluding }: AliasWindow,
): Promise<Map<string, string[]>> {
  const labels = await prisma.resolutionEvent.findMany({
    where: { kind: 'place', outcome: { in: [...LABELS] }, createdAt: { lt: before }, id: { notIn: [...excluding] } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { userId: true, words: true, outcome: true, chosenId: true },
  });
  const taught = new Map<string, Set<string>>();
  for (const { userId, words, outcome, chosenId } of labels) {
    if (words === '' || chosenId === null) {
      continue;
    }
    const places = taught.get(key(userId, words)) ?? new Set<string>();
    if (outcome === 'rejected') {
      places.delete(chosenId);
    } else {
      places.add(chosenId);
    }
    taught.set(key(userId, words), places);
  }
  return new Map([...taught].map(([at, places]) => [at, [...places]]));
}

// When an alias of the Place last answered or was chosen for the words: GlobalAliases marks it used whenever it
// answers, and a choice of its Place resets its decay. Before any, it is as new as the window's end.
async function lastUseOf(prisma: PrismaClient, words: string, placeId: string, window: AliasWindow): Promise<Date> {
  const last = await prisma.resolutionEvent.findFirst({
    where: {
      kind: 'place',
      words,
      createdAt: { lt: window.before },
      id: { notIn: [...window.excluding] },
      OR: [
        { outcome: { in: ['chosen', 'edited'] }, chosenId: placeId },
        { outcome: 'answered', aliasSource: 'global', candidateIds: { has: placeId } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return last?.createdAt ?? window.before;
}

// The Place everyone's alias of the words would name at the window's end, through the server's own count
// (alias-standings.ts) and rules (alias-rules.ts), or none.
async function globalAliasOf(prisma: PrismaClient, words: string, window: AliasWindow): Promise<string | null> {
  const { standings, allSupporters } = await standingsOf(prisma, words, window);
  const top = topOf(standings);
  if (top === undefined) {
    return null;
  }
  const score = scoreOf(top, await lastUseOf(prisma, words, top.placeId, window), window.before);
  return qualifies(top, allSupporters, score) ? top.placeId : null;
}

export async function learnedAliases(prisma: PrismaClient, window: AliasWindow): Promise<LearnedAliases> {
  const personal = await personalAliases(prisma, window);
  const words = [...new Set(window.words.map((text) => normaliseWords(text)))].filter((text) => text !== '');
  const global = new Map<string, string>();
  const named = await Promise.all(
    words.map(async (text) => [text, await globalAliasOf(prisma, text, window)] as const),
  );
  for (const [text, placeId] of named) {
    if (placeId !== null) {
      global.set(text, placeId);
    }
  }
  return {
    personal: {
      lookup: (query, userId): Promise<AliasHit[]> =>
        Promise.resolve(
          (personal.get(key(userId, query)) ?? []).map((placeId): AliasHit => ({ placeId, source: 'personal' })),
        ),
    },
    global: {
      lookup: (query, userId): Promise<AliasHit[]> => {
        const placeId = global.get(query);
        return Promise.resolve(
          placeId === undefined || heldBack(userId, window.holdbackPercent) ? [] : [{ placeId, source: 'global' }],
        );
      },
    },
    personalCount: [...personal.values()].reduce((total, places) => total + places.length, 0),
    globalCount: global.size,
  };
}
