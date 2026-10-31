/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { expectSchema } from './expect.ts';

// The cases (spec P19, "Cases"): YAML files under eval/cases/ and eval/p4/cases/, one per category, each a list of
// cases. A case is a conversation and what the Assistant should do in it. This file reads them; what `expect` holds is
// the scorer's (eval/expect.ts).
//
// Three kinds of case, by their turns:
// - single turn: one User's message;
// - fixed history: the earlier turns written out, the Assistant's as the app would send them back (its text, its
//   cards by seed name, its Proposal with seed names), and the User's last message, the one scored;
// - live (`live: true`): only the User's messages; each is sent with the Assistant's real replies before it.

export const CASES_DIRECTORY = new URL('cases/', import.meta.url);

const P4_CASES_DIRECTORY = new URL('p4/cases/', import.meta.url);

// The worlds a case can run in: `small`, P19's (eval/world.ts), and `p4`, of the 공강 tools (eval/p4/world.ts). A run is
// of one world.
export const WORLDS = ['small', 'p4'] as const;

export type WorldName = (typeof WORLDS)[number];

// When a run of each world stands in Korea, unless a case gives its own `now`: 2026-10-21 (수) 14:05 and 2026-11-02
// (월) 11:30.
export const WORLD_CLOCKS: Record<WorldName, string> = {
  small: '2026-10-21T14:05:00+09:00',
  p4: '2026-11-02T11:30:00+09:00',
};

const seedName = z.string().min(1);

// A Restaurant card's seed is its key, the name `GET /menus` gives it.
const cardSchema = z.strictObject({ kind: z.enum(['quest', 'globalEvent', 'restaurant']), seed: seedName });

// A Proposal the Assistant made, with its Place, its Global Event and its invitees by seed name. The endpoint checks
// the other values, as it does the app's; the join policies and Boards are the database's (prisma/schema.prisma).
const proposalSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  joinPolicy: z.enum(['open', 'approval', 'closed']),
  board: z.enum(['meal', 'career', 'hobby', 'show']).nullable(),
  capacity: z.int(),
  startsAt: z.iso.datetime({ offset: true }),
  place: seedName.nullable().default(null),
  globalEvent: seedName.nullable().default(null),
  invitees: z.array(seedName).default([]),
});

const userTurnSchema = z.strictObject({
  user: z.string().min(1),
  // A live case's expectation of this turn.
  expect: expectSchema.optional(),
});

const assistantTurnSchema = z.strictObject({
  assistant: z.strictObject({
    text: z.string().min(1),
    cards: z.array(cardSchema).default([]),
    proposal: proposalSchema.nullable().default(null),
  }),
});

export const caseSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Expected lowercase words joined by hyphens'),
    category: z.string().min(1),
    world: z.enum(WORLDS).default('small'),
    // When the case stands, if not at its world's clock.
    now: z.iso.datetime({ offset: true }).optional(),
    // Who asks, by a name in the world's `askers`, if not the world's User.
    asker: seedName.optional(),
    live: z.boolean().default(false),
    // Run this many times, for pass^k (the repeated set).
    repeat: z.int().min(2).optional(),
    // Why the Assistant does not do this yet: scored as usual, reported apart.
    knownFailure: z.string().min(1).optional(),
    turns: z.array(z.union([userTurnSchema, assistantTurnSchema])).min(1),
    // What the scored turn should be, for the scorer: the last, or a live case's last when it gives none of its own.
    expect: expectSchema.optional(),
  })
  .refine(({ knownFailure, expect }) => knownFailure === undefined || expect?.knownFailure === undefined, {
    message: 'Give knownFailure on the case or in its expect, not both',
    path: ['knownFailure'],
  })
  .refine(({ turns }) => turns.findLastIndex((turn) => 'user' in turn) === turns.length - 1, {
    message: "The last turn must be the User's",
    path: ['turns'],
  })
  .refine(({ live, turns }) => !live || turns.every((turn) => 'user' in turn), {
    message: "A live case holds only the User's turns",
    path: ['turns'],
  });

export type EvalCase = z.output<typeof caseSchema>;
export type CaseTurn = EvalCase['turns'][number];
export type CaseProposal = z.output<typeof proposalSchema>;
export type CaseKind = 'single' | 'history' | 'live';

export function kindOf({ live, turns }: EvalCase): CaseKind {
  if (live) {
    return 'live';
  }
  return turns.length === 1 ? 'single' : 'history';
}

function casesInDirectory(directory: URL): EvalCase[] {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith('.yaml'))
    .toSorted();
  return files.flatMap((name) => {
    const parsed = z.array(caseSchema).safeParse(parse(readFileSync(new URL(name, directory), 'utf8')));
    if (!parsed.success) {
      throw new Error(`${name}: ${z.prettifyError(parsed.error)}`);
    }
    return parsed.data;
  });
}

// Every case of every file in the directories, in the order of the files' names and then as written. A case that does
// not fit the schema, or an id used twice, fails the whole load.
export function loadCases(directories: readonly URL[] = [CASES_DIRECTORY, P4_CASES_DIRECTORY]): EvalCase[] {
  const cases = directories.flatMap((directory) => casesInDirectory(directory));
  const seen = new Set<string>();
  for (const { id } of cases) {
    if (seen.has(id)) {
      throw new Error(`The case id ${id} is used twice`);
    }
    seen.add(id);
  }
  return cases;
}

export function casesIn(cases: readonly EvalCase[], world: WorldName): EvalCase[] {
  return cases.filter((evalCase) => evalCase.world === world);
}

// When the case stands, in Korea.
export function nowOf({ world, now }: EvalCase): string {
  return now ?? WORLD_CLOCKS[world];
}

// What to run: the cases in any of `categories` or named in `caseIds`, or every case when both are empty. A category or
// an id that no case has is refused, so that a typo does not run nothing.
export function selectCases(cases: EvalCase[], categories: readonly string[], caseIds: readonly string[]): EvalCase[] {
  const unknown = [
    ...categories.filter((category) => !cases.some((evalCase) => evalCase.category === category)),
    ...caseIds.filter((id) => !cases.some((evalCase) => evalCase.id === id)),
  ];
  if (unknown.length > 0) {
    throw new Error(`No case has the category or id: ${unknown.join(', ')}`);
  }
  if (categories.length === 0 && caseIds.length === 0) {
    return cases;
  }
  return cases.filter(({ id, category }) => categories.includes(category) || caseIds.includes(id));
}

// How many times a case runs: once, or for a case of the repeated set, `repeat` when given and else its own count.
export function repetitionsOf(evalCase: EvalCase, repeat: number | null): number {
  return evalCase.repeat === undefined ? 1 : (repeat ?? evalCase.repeat);
}

// The turns sent to the model in one run of the case: each of a live case's, one for the others.
export function sentTurnsOf(evalCase: EvalCase): number {
  return kindOf(evalCase) === 'live' ? evalCase.turns.length : 1;
}
