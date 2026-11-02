/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type CardsExpectation, type LibraryConditions } from './expect.ts';
import { type Names } from './normalise.ts';
import { dayOf, isRecord, minutesOf, spaceIdOf, startOf, wordsOf } from './readers.ts';

// The library card of a reply (P06 spec, "Cards and the API contract"), read one way, and the matcher of the
// `expect.cards` kind `library`. A card is `{ kind: 'library', library: { key, action, space: { id, … }, date, start,
// minutes, seat, useDesc, companions: [{ friendId, name }], questId, target } }`; a field the card lacks is read from its
// key, `<action>:<space id>:<YYYY-MM-DD>:<HHMM>:<minutes>`, such as book:7F-7A-zone2:2026-11-04:1700:60. Friends and
// the Quest are read as seed names, dates as YYYY-MM-DD and starts as HH:MM.

export interface LibraryCardSeen {
  action: unknown;
  space: unknown;
  date: unknown;
  start: unknown;
  minutes: unknown;
  seat: unknown;
  equipment: unknown;
  useDesc: unknown;
  companions: string[];
  quest: string | null;
  target: { date: unknown; space: unknown; start: unknown } | null;
}

// The parts of a card's key, those it lacks left out.
function keyParts(key: unknown): Partial<Record<'action' | 'space' | 'date' | 'start' | 'minutes', string>> {
  if (typeof key !== 'string') {
    return {};
  }
  const [action, space, date, start, minutes] = key.split(':');
  const given = { action, space, date, start, minutes };
  return Object.fromEntries(Object.entries(given).filter(([, part]) => part !== undefined && part !== ''));
}

// The value given, else null: a field the card leaves unset reads as null.
const orNull = (input: unknown): unknown => (input === undefined || input === '' ? null : input);

function seedOrId(id: unknown, names: Names): string | null {
  return typeof id === 'string' ? (names(id) ?? id) : null;
}

function companionsOf(companions: unknown, names: Names): string[] {
  if (!Array.isArray(companions)) {
    return [];
  }
  return companions
    .map((companion) => seedOrId(isRecord(companion) ? companion.friendId : companion, names) ?? '')
    .toSorted();
}

function targetOf(target: unknown): LibraryCardSeen['target'] {
  if (!isRecord(target)) {
    return null;
  }
  return {
    date: orNull(dayOf(target.date)),
    space: orNull(spaceIdOf(target.spaceId ?? target.space)),
    start: orNull(startOf(target.start)),
  };
}

function equipmentOf(card: Record<string, unknown>, space: unknown): unknown {
  if (card.equipment !== undefined) {
    return wordsOf(card.equipment);
  }
  return isRecord(space) ? (wordsOf(space.equipment ?? space.group) ?? null) : null;
}

// One library card as the scorer reads it, or null for a card of another kind.
export function libraryCardOf(card: unknown, names: Names): LibraryCardSeen | null {
  if (!isRecord(card) || card.kind !== 'library') {
    return null;
  }
  const library = isRecord(card.library) ? card.library : card;
  const fromKey = keyParts(library.key ?? card.id);
  const { space } = library;
  const spaceId = isRecord(space) ? space.id : space;
  return {
    action: orNull(library.action ?? fromKey.action),
    space: orNull(spaceIdOf(spaceId ?? fromKey.space)),
    date: orNull(dayOf(library.date ?? fromKey.date)),
    start: orNull(startOf(library.start ?? fromKey.start)),
    minutes: orNull(minutesOf(library.minutes ?? fromKey.minutes)),
    seat: orNull(wordsOf(library.seat)),
    equipment: orNull(equipmentOf(library, space)),
    useDesc: orNull(wordsOf(library.useDesc)),
    companions: companionsOf(library.companions, names),
    quest: seedOrId(library.questId, names),
    target: targetOf(library.target),
  };
}

export function libraryCardsOf(cards: readonly unknown[], names: Names): LibraryCardSeen[] {
  return cards.flatMap((card) => {
    const seen = libraryCardOf(card, names);
    return seen === null ? [] : [seen];
  });
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// How each plain condition is read, and where the card holds it.
const CONDITIONS: Record<string, { read: (input: unknown) => unknown; of: (seen: LibraryCardSeen) => unknown }> = {
  date: { read: dayOf, of: ({ date }) => date },
  start: { read: startOf, of: ({ start }) => start },
  minutes: { read: minutesOf, of: ({ minutes }) => minutes },
  seat: { read: wordsOf, of: ({ seat }) => seat },
  equipment: { read: wordsOf, of: ({ equipment }) => equipment },
  useDesc: { read: wordsOf, of: ({ useDesc }) => useDesc },
  quest: { read: (input) => input, of: ({ quest }) => quest },
};

const TARGET: Record<string, { read: (input: unknown) => unknown; of: (target: Target) => unknown }> = {
  date: { read: dayOf, of: ({ date }) => date },
  space: { read: spaceIdOf, of: ({ space }) => space },
  start: { read: startOf, of: ({ start }) => start },
};

type Target = NonNullable<LibraryCardSeen['target']>;

function targetMismatches(given: unknown, seen: LibraryCardSeen): string[] {
  const actual = seen.target ?? { date: null, space: null, start: null };
  return Object.entries(isRecord(given) ? given : {})
    .filter(([field, value]) => {
      const rule = TARGET[field];
      return rule === undefined || !same(rule.read(value), rule.of(actual));
    })
    .map(([field]) => `target.${field}`);
}

// The conditions the card does not hold.
function conditionMismatches(wanted: LibraryConditions, seen: LibraryCardSeen): string[] {
  return Object.entries(wanted).flatMap(([name, given]): string[] => {
    if (name === 'companions') {
      return same(Array.isArray(given) ? given.map(String).toSorted() : given, seen.companions) ? [] : [name];
    }
    if (name === 'target') {
      return targetMismatches(given, seen);
    }
    const rule = CONDITIONS[name];
    if (rule === undefined) {
      return [name];
    }
    return same(given === null ? null : rule.read(given), rule.of(seen)) ? [] : [name];
  });
}

// What makes a card differ from the expectation's key fields: none when it matches.
export function libraryMismatches(expected: CardsExpectation, seen: LibraryCardSeen): string[] {
  return [
    ...(expected.action !== undefined && expected.action !== seen.action ? ['action'] : []),
    ...(expected.space !== undefined && expected.space !== seen.space ? ['space'] : []),
    ...conditionMismatches(expected.conditions ?? {}, seen),
  ];
}

function describe({ action, space }: CardsExpectation): string {
  return ['library', action ?? 'any', space].filter((part) => part !== undefined).join(' ');
}

// Why the reply's library cards fail one expectation: none when as many cards match as it asks, at least one when it
// gives neither min nor max. The closest card's mismatches are named when none matches.
export function libraryCardFailures(expected: CardsExpectation, seen: readonly LibraryCardSeen[]): string[] {
  const mismatches = seen.map((card) => libraryMismatches(expected, card));
  const matching = mismatches.filter((wrong) => wrong.length === 0).length;
  const min = expected.min ?? (expected.max === undefined ? 1 : undefined);
  const failures: string[] = [];
  if (min !== undefined && matching < min) {
    const closest = mismatches.toSorted((a, b) => a.length - b.length)[0];
    const why = closest === undefined ? 'no library card' : `closest differs in ${closest.join(', ')}`;
    failures.push(`${matching} ${describe(expected)} cards, fewer than ${min} (${why})`);
  }
  if (expected.max !== undefined && matching > expected.max) {
    failures.push(`${matching} ${describe(expected)} cards, more than ${expected.max}`);
  }
  return failures;
}
