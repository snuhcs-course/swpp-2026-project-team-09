/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type EvalCase } from '../eval/cases.ts';
import { type Expect } from '../eval/expect.ts';
import { type Seeded, type World } from '../eval/world.ts';

// The seed names a case gives, so that the case-schema tests can check each is in its world as that kind of thing.

export interface SeedRef {
  kind: Seeded['kind'];
  name: string;
}

// The seed names of a Proposal, expected or written in an Assistant's turn: its Place, Global Event and invitees.
function refsOfProposal(
  proposal: { place?: string | null; globalEvent?: string | null; invitees?: string[] } | null | undefined,
): SeedRef[] {
  const { place, globalEvent, invitees } = proposal ?? {};
  return [
    ...(typeof place === 'string' ? [{ kind: 'place' as const, name: place }] : []),
    ...(typeof globalEvent === 'string' ? [{ kind: 'globalEvent' as const, name: globalEvent }] : []),
    ...(invitees ?? []).map((name) => ({ kind: 'friend' as const, name })),
  ];
}

const namesIn = (written: unknown): string[] => (Array.isArray(written) ? written.map(String) : []);

// An item's seed names a time of day when it holds no space: 14:00, now and end are no items.
const isItem = (written: unknown): written is string => typeof written === 'string' && / \(.\)$/u.test(written);

// The id fields of a tool's arguments.
function refsOfArgs(tool: string, args: Readonly<Record<string, unknown>>): SeedRef[] {
  const { globalEvent, place, invitees, friends, departurePlace, from, to, keys, ids } = args;
  return [
    ...(typeof globalEvent === 'string' ? [{ kind: 'globalEvent' as const, name: globalEvent }] : []),
    ...(tool === 'proposeQuest' && typeof place === 'string' ? [{ kind: 'place' as const, name: place }] : []),
    ...(typeof departurePlace === 'string' ? [{ kind: 'place' as const, name: departurePlace }] : []),
    ...namesIn(tool === 'proposeQuest' ? invitees : []).map((name) => ({ kind: 'friend' as const, name })),
    ...namesIn(friends).map((name) => ({ kind: 'friend' as const, name })),
    ...namesIn(tool === 'showRestaurants' ? keys : []).map((name) => ({ kind: 'restaurant' as const, name })),
    ...namesIn(tool === 'showQuests' ? ids : []).map((name) => ({ kind: 'quest' as const, name })),
    ...namesIn(tool === 'showGlobalEvents' ? ids : []).map((name) => ({ kind: 'globalEvent' as const, name })),
    ...[from, to].filter((written) => isItem(written)).map((name) => ({ kind: 'item' as const, name })),
  ];
}

// The seed names of what the 공강 tools must answer.
function refsOfResults(results: Expect['results']): SeedRef[] {
  const { getMyDay, findFreeTimeEvents, findFreeFriends, findMealRestaurants } = results ?? {};
  const candidates = findFreeTimeEvents?.result === 'found' ? findFreeTimeEvents.candidates : [];
  const restaurants = findMealRestaurants?.result === 'found' ? findMealRestaurants.restaurants : [];
  return [
    ...(getMyDay?.items ?? []).map(({ seed }) => ({ kind: 'item' as const, name: seed })),
    ...candidates.map(({ kind, seed }) => ({ kind, name: seed })),
    ...(findFreeFriends?.friends ?? []).map(({ seed }) => ({ kind: 'friend' as const, name: seed })),
    ...restaurants.map(({ seed }) => ({ kind: 'restaurant' as const, name: seed })),
    ...Object.entries(results ?? {}).flatMap(([tool, result]) => refsOfArgs(tool, result?.args ?? {})),
  ];
}

// The seed names of an `expect`: its cards, its Proposal, its results and the id fields of its arguments.
function refsOfExpect(expected: Expect): SeedRef[] {
  return [
    ...(expected.cards ?? []).flatMap(({ kind, seeds }) => seeds.map((name) => ({ kind, name }))),
    ...refsOfProposal(expected.proposal),
    ...refsOfResults(expected.results),
    ...Object.entries(expected.args).flatMap(([tool, written]) =>
      (Array.isArray(written) ? written : [written]).flatMap((args) => refsOfArgs(tool, args)),
    ),
  ];
}

// Every seed name of a case: those of its expectations and of the Assistant's turns it writes out.
function refsOf(evalCase: EvalCase): SeedRef[] {
  return [
    ...(evalCase.expect === undefined ? [] : refsOfExpect(evalCase.expect)),
    ...evalCase.turns.flatMap((turn): SeedRef[] => {
      if ('user' in turn) {
        return turn.expect === undefined ? [] : refsOfExpect(turn.expect);
      }
      const { cards, proposal } = turn.assistant;
      return [...cards.map((card) => ({ kind: card.kind, name: card.seed })), ...refsOfProposal(proposal)];
    }),
  ];
}

// The seed names the cases give that the world lacks, or has as something of another kind.
export function unseeded(cases: readonly EvalCase[], world: World): string[] {
  return cases.flatMap((evalCase) =>
    refsOf(evalCase)
      .filter(({ kind, name }) => world.seeds[name]?.kind !== kind)
      .map(({ kind, name }) => `${evalCase.id}: ${kind} ${name}`),
  );
}
