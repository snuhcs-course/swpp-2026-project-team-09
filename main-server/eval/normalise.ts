/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { boardOf, clockOf, dayOf, isRecord, momentOf, windowOf, wordsOf } from './readers.ts';
import { type ToolCallTrace } from './trace.ts';

// The normalisers (spec P19, "Scoring"): each tool's arguments and results, and the reply's cards and Proposal, read
// one way, so that the scorer compares meanings rather than spellings, and a format change in a tool is one edit here.
// Dates are read as YYYY-MM-DD in Korea, starts as the day and HH:MM in Korea, the words given to a resolver trimmed,
// Boards by name, and ids as the names of the seeds they are (eval/world.ts), so that a case writes 학생회관, not an id.

// A tool's place in a run. A lookup reads data, a presenter adds it to the reply, a resolver turns the User's words
// into candidates and the proposer checks a 파티 and proposes it.
export type ToolRole = 'lookup' | 'presenter' | 'resolver' | 'proposer';

// What a call answered: its `result`, a thrown error, or nothing, when the run ended before the tool did.
const OUTCOMES = [
  'found',
  'none',
  'needs',
  'one',
  'several',
  'shown',
  'proposed',
  'refused',
  'error',
  'unfinished',
] as const;

export type Outcome = (typeof OUTCOMES)[number];

// The seed name of an id, or undefined for an id no seed has.
export type Names = (id: string) => string | undefined;

export function namesOf<Seed extends { id: string }>(seeds: Readonly<Record<string, Seed>>): Names {
  const byId = new Map(Object.entries(seeds).map(([name, { id }]) => [id, name]));
  return (id) => byId.get(id);
}

// How a field is read. day: a calendar day in Korea. moment: the day and HH:MM in Korea. clock: HH:MM in Korea. item: an
// item's seed name, or else a clock time. window: two clock times. words: trimmed text. words[]: a list of them, matched
// when it holds every word expected. board: a Board's name. id and ids: seed names, a list matched when it is the same
// set. value: as it is.
type Field = 'day' | 'moment' | 'clock' | 'item' | 'window' | 'words' | 'words[]' | 'board' | 'id' | 'ids' | 'value';

// A field as the scorer names it: renamed from an id field, such as placeId to place.
interface FieldRule {
  as?: string;
  read: Field;
}

interface ToolRule {
  role: ToolRole;
  fields: Record<string, FieldRule>;
}

const day = { read: 'day' } as const;
const words = { read: 'words' } as const;
const value = { read: 'value' } as const;
const CLOCK = { read: 'clock' } as const;
const ITEM = { read: 'item' } as const;
const BOARD = { read: 'board' } as const;
const ID = { read: 'id' } as const;

// The arguments of the two tools that judge a meal.
const mealFields: Record<string, FieldRule> = {
  date: day,
  meal: value,
  window: { read: 'window' },
  friendIds: { as: 'friends', read: 'ids' },
};

// One entry per tool of the Assistant (src/assistant/tools/), by the name the model calls it.
const TOOLS: Record<string, ToolRule> = {
  getMenus: { role: 'lookup', fields: { date: day, meal: value, restaurant: words } },
  getShuttle: { role: 'lookup', fields: {} },
  searchGlobalEvents: { role: 'lookup', fields: { from: day, to: day, place: words, words: { read: 'words[]' } } },
  searchRecruitingQuests: {
    role: 'lookup',
    fields: { board: BOARD, from: day, to: day, globalEventId: { as: 'globalEvent', ...ID } },
  },
  showOnMap: { role: 'presenter', fields: { layer: value } },
  showGlobalEvents: { role: 'presenter', fields: { ids: { read: 'ids' } } },
  showQuests: { role: 'presenter', fields: { ids: { read: 'ids' } } },
  resolveFriend: { role: 'resolver', fields: { name: words } },
  resolvePlace: { role: 'resolver', fields: { words } },
  resolveGlobalEvent: { role: 'resolver', fields: { words, from: day, to: day } },
  proposeQuest: {
    role: 'proposer',
    fields: {
      title: words,
      description: words,
      joinPolicy: value,
      board: BOARD,
      capacity: value,
      startsAt: { read: 'moment' },
      placeId: { as: 'place', ...ID },
      globalEventId: { as: 'globalEvent', ...ID },
      inviteeIds: { as: 'invitees', read: 'ids' },
    },
  },
  getMyDay: { role: 'lookup', fields: { date: day } },
  findFreeTimeEvents: {
    role: 'lookup',
    fields: { date: day, from: ITEM, to: ITEM, board: BOARD, departurePlace: ID, departureTime: CLOCK, leaveBy: CLOCK },
  },
  findFreeFriends: { role: 'lookup', fields: mealFields },
  findMealRestaurants: {
    role: 'lookup',
    fields: { ...mealFields, departurePlace: ID, departureTime: CLOCK, leaveBy: CLOCK },
  },
  showRestaurants: { role: 'presenter', fields: { keys: { read: 'ids' } } },
};

export function roleOf(tool: string): ToolRole | null {
  return TOOLS[tool]?.role ?? null;
}

function nameOf(input: unknown, names: Names): unknown {
  return typeof input === 'string' ? (names(input) ?? input) : input;
}

// Lists compared as sets are sorted first.
function sorted<T>(values: readonly T[]): T[] {
  return values
    .map((item) => ({ item, key: JSON.stringify(item) }))
    .toSorted((x, y) => (x.key < y.key ? -1 : Number(x.key > y.key)))
    .map(({ item }) => item);
}

const READERS: Record<Field, (input: unknown, names: Names) => unknown> = {
  day: (input) => dayOf(input),
  moment: (input) => momentOf(input),
  clock: (input) => clockOf(input),
  item: (input, names) => (typeof input === 'string' ? (names(input) ?? clockOf(input)) : input),
  window: (input) => windowOf(input),
  words: (input) => wordsOf(input),
  'words[]': (input) => (Array.isArray(input) ? input.map((word) => wordsOf(word)) : wordsOf(input)),
  board: (input) => boardOf(input),
  id: (input, names) => nameOf(input, names),
  ids: (input, names) => (Array.isArray(input) ? sorted(input.map((id) => nameOf(id, names))) : nameOf(input, names)),
  value: (input) => input,
};

function read(field: Field, input: unknown, names: Names): unknown {
  return READERS[field](input, names);
}

// The field of a tool by the scorer's name for it, from either name.
function fieldOf(tool: string, key: string): { name: string; read: Field } {
  const fields = TOOLS[tool]?.fields ?? {};
  const entry = Object.entries(fields).find(([given, rule]) => given === key || rule.as === key);
  return entry === undefined ? { name: key, read: 'value' } : { name: entry[1].as ?? entry[0], read: entry[1].read };
}

// A call's arguments as the scorer reads them; a tool not in the table keeps them as they are.
export function normaliseArgs(tool: string, input: unknown, names: Names): Record<string, unknown> {
  if (!isRecord(input)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(input).map(([key, given]) => {
      const field = fieldOf(tool, key);
      return [field.name, read(field.read, given, names)];
    }),
  );
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function fieldMatches(field: Field, expected: unknown, actual: unknown): boolean {
  if (field === 'words[]' && Array.isArray(expected)) {
    return Array.isArray(actual) && expected.every((word) => actual.includes(word));
  }
  return same(expected, actual);
}

// Whether a call's normalised arguments hold the expected ones, written by seed name and in any form of date; fields
// not expected may be anything.
export function argsMatch(
  tool: string,
  expected: Readonly<Record<string, unknown>>,
  actual: Readonly<Record<string, unknown>>,
  names: Names,
): boolean {
  const wanted = normaliseArgs(tool, expected, names);
  return Object.entries(wanted).every(([name, given]) => fieldMatches(fieldOf(tool, name).read, given, actual[name]));
}

// The same call, for counting a call repeated with the same arguments.
export function callKey(tool: string, args: Readonly<Record<string, unknown>>): string {
  const ordered = Object.fromEntries(Object.entries(args).toSorted(([a], [b]) => a.localeCompare(b)));
  return `${tool} ${JSON.stringify(ordered)}`;
}

const OUTCOME_SET = new Set<unknown>(OUTCOMES);

function isOutcome(answered: unknown): answered is Outcome {
  return OUTCOME_SET.has(answered);
}

// What a call answered. A result of another shape counts as an error, since no tool answers one.
export function outcomeOf(call: ToolCallTrace): Outcome {
  if (call.error !== undefined) {
    return 'error';
  }
  if (call.result === undefined) {
    return 'unfinished';
  }
  if (isRecord(call.result) && 'needs' in call.result) {
    return 'needs';
  }
  const answered = isRecord(call.result) ? call.result.result : undefined;
  return isOutcome(answered) ? answered : 'error';
}

// A card of the reply: its kind and its seed name, else the title it shows.
export interface CardSeen {
  kind: string;
  name: string;
}

function titled(entry: unknown, names: Names): string {
  if (!isRecord(entry)) {
    return '';
  }
  const { title, name } = entry;
  const given = entry.id ?? entry.key;
  const seed = typeof given === 'string' ? names(given) : undefined;
  if (seed !== undefined) {
    return seed;
  }
  if (typeof title === 'string') {
    return title;
  }
  return typeof name === 'string' ? name : '';
}

export function cardsOf(cards: readonly unknown[], names: Names): CardSeen[] {
  return cards
    .filter((card) => isRecord(card))
    .map((card) => {
      const kind = typeof card.kind === 'string' ? card.kind : '';
      return { kind, name: titled(card[kind], names) };
    });
}

// A Proposal of the reply as the scorer reads it.
export interface ProposalSeen {
  joinPolicy: unknown;
  board: unknown;
  capacity: unknown;
  startsAt: unknown;
  place: string | null;
  globalEvent: string | null;
  invitees: string[];
}

export function proposalOf(proposal: unknown, names: Names): ProposalSeen | null {
  if (!isRecord(proposal)) {
    return null;
  }
  const { joinPolicy, board, capacity, startsAt, place, globalEvent, invitees } = proposal;
  return {
    joinPolicy,
    board: boardOf(board),
    capacity,
    startsAt: momentOf(startsAt),
    place: isRecord(place) ? titled(place, names) : null,
    globalEvent: isRecord(globalEvent) ? titled(globalEvent, names) : null,
    invitees: Array.isArray(invitees) ? sorted(invitees.map((invitee) => titled(invitee, names))) : [],
  };
}

const PROPOSAL_FIELDS: Record<keyof ProposalSeen, (input: unknown) => unknown> = {
  joinPolicy: (input) => input,
  board: boardOf,
  capacity: (input) => input,
  startsAt: momentOf,
  place: (input) => input,
  globalEvent: (input) => input,
  invitees: (input) => (Array.isArray(input) ? sorted(input) : input),
};

function isProposalField(name: string): name is keyof ProposalSeen {
  return Object.hasOwn(PROPOSAL_FIELDS, name);
}

// The expected fields the Proposal does not hold, all of them when there is no Proposal.
export function proposalMismatches(
  expected: Readonly<Record<string, unknown>>,
  proposal: ProposalSeen | null,
): string[] {
  return Object.entries(expected)
    .filter(
      ([name, given]) =>
        proposal === null || !isProposalField(name) || !same(PROPOSAL_FIELDS[name](given), proposal[name]),
    )
    .map(([name]) => name);
}
