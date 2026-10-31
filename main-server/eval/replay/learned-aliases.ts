/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { aliasOf, chainOf, sourceOf } from '../../src/assistant/aliases/alias-chain.js';
import { chainRows } from '../../src/assistant/aliases/alias-rows.js';
import { MIN_SCORE, scoreOf, type Standing } from '../../src/assistant/aliases/alias-rules.js';
import { heldBack } from '../../src/common/holdback.js';
import { normaliseWords } from '../../src/common/normalise-words.js';
import { type PrismaClient } from '../../src/generated/prisma/client.js';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import { type AliasHit, type PlaceAliases } from '../../src/places/place-aliases.js';
import { qualifies, standingsOf, topOf } from './counted-aliases.ts';
import { stageB } from './stages.ts';

// The aliases of stages C and D (P07 tickets 05 and 06): the Place aliases the server would have held at a time,
// rebuilt from the resolution_events before it, by ticket 03's count (C) and by the alias chain the server learns by
// (D), and kept in memory as alias sources; nothing is written. Aliases a User deleted from their list leave no event,
// so the replay still counts them.

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
  // Everyone's aliases by the count, and by the chain.
  counted: PlaceAliases;
  chained: PlaceAliases;
  // How many (User, words, Place) personal aliases, and words with everyone's alias by each rule, were rebuilt.
  personalCount: number;
  countedCount: number;
  chainedCount: number;
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

// Whether the Place's alias, as the rule picked it, would still answer at the window's end for its score.
async function scores(prisma: PrismaClient, words: string, standing: Standing, window: AliasWindow): Promise<boolean> {
  return scoreOf(standing, await lastUseOf(prisma, words, standing.placeId, window), window.before) >= MIN_SCORE;
}

// The Place everyone's alias of the words would name at the window's end by ticket 03's count (counted-aliases.ts),
// or none.
async function countedAliasOf(prisma: PrismaClient, words: string, window: AliasWindow): Promise<string | null> {
  const { standings, allSupporters } = await standingsOf(prisma, words, window);
  const top = topOf(standings);
  if (top === undefined) {
    return null;
  }
  const score = scoreOf(top, await lastUseOf(prisma, words, top.placeId, window), window.before);
  return qualifies(top, allSupporters, score) ? top.placeId : null;
}

// The Place everyone's alias of each words would name at the window's end by the chain (alias-chain.ts), from the rows
// of the window, the reading by stage B's rules as each words' source, through the same score as the server's.
async function chainedAliases(
  prisma: PrismaClient,
  places: readonly PlaceDto[],
  words: readonly string[],
  window: AliasWindow,
): Promise<Map<string, string>> {
  const chain = chainOf(await chainRows(prisma, { before: window.before, excluding: window.excluding }));
  const rules = stageB(places);
  const named = new Map<string, string>();
  for (const text of words) {
    // oxlint-disable-next-line no-await-in-loop -- one words at a time, as the server counts them
    const { alias } = aliasOf(chain, text, sourceOf(text, (await rules(text, '')).candidates));
    // oxlint-disable-next-line no-await-in-loop -- the same
    if (alias !== null && (await scores(prisma, text, alias, window))) {
      named.set(text, alias.placeId);
    }
  }
  return named;
}

// Everyone's aliases as a source, which never answers a held-back account.
function everyoneOf(named: ReadonlyMap<string, string>, holdbackPercent: number): PlaceAliases {
  return {
    lookup: (query, userId): Promise<AliasHit[]> => {
      const placeId = named.get(query);
      return Promise.resolve(
        placeId === undefined || heldBack(userId, holdbackPercent) ? [] : [{ placeId, source: 'global' }],
      );
    },
  };
}

export async function learnedAliases(
  prisma: PrismaClient,
  places: readonly PlaceDto[],
  window: AliasWindow,
): Promise<LearnedAliases> {
  const personal = await personalAliases(prisma, window);
  const words = [...new Set(window.words.map((text) => normaliseWords(text)))].filter((text) => text !== '');
  const counted = new Map<string, string>();
  const named = await Promise.all(
    words.map(async (text) => [text, await countedAliasOf(prisma, text, window)] as const),
  );
  for (const [text, placeId] of named) {
    if (placeId !== null) {
      counted.set(text, placeId);
    }
  }
  const chained = await chainedAliases(prisma, places, words, window);
  return {
    personal: {
      lookup: (query, userId): Promise<AliasHit[]> =>
        Promise.resolve(
          (personal.get(key(userId, query)) ?? []).map((placeId): AliasHit => ({ placeId, source: 'personal' })),
        ),
    },
    counted: everyoneOf(counted, window.holdbackPercent),
    chained: everyoneOf(chained, window.holdbackPercent),
    personalCount: [...personal.values()].reduce((total, list) => total + list.length, 0),
    countedCount: counted.size,
    chainedCount: chained.size,
  };
}
