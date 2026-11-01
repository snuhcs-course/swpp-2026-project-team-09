/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { metresBetween } from '../../../src/common/geometry.ts';
import {
  canBeOffered,
  endOfEvent,
  eventInWindow,
  eventsByKey,
  momentOf,
  positionOf,
  sharedEvents,
  type Window,
} from './answers.ts';
import { type LargeGlobalEvent, type LargeQuest, type LargeWorldData } from './world-data.ts';

// What the search tools will answer at each step of the spec (P05 spec, "Search tools"), as the generator reckons it, to
// mark which ticket each case's server recall waits for and to refuse a world in which E7's subsets could never reach a
// server recall of 1.0. The test of server recall checks the marks against the real server. It is the generator's alone:
// a run never comes here.

export type Stage = 'today' | 'ticket 10' | 'ticket 11';

export interface IntendedCall {
  tool: 'searchRecruitingQuests' | 'searchGlobalEvents';
  input: Record<string, unknown>;
}

const MOST_AT = { today: 20, 'ticket 10': 20, 'ticket 11': 30 } as const;

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

// The window of the call's after and before, or from and to. With only after, it ends at 23:59 of that day.
function windowOf({ after, before, from, to }: Record<string, unknown>): Window | null {
  const start = text(after);
  const end = text(before);
  if (start !== undefined || end !== undefined) {
    const day = (start ?? end ?? '').slice(0, 10);
    return { from: start ?? `${day}T00:00`, to: end ?? `${day}T23:59` };
  }
  const first = text(from);
  const last = text(to);
  return first === undefined || last === undefined ? null : { from: `${first}T00:00`, to: `${last}T23:59` };
}

const wordsOf = ({ words }: Record<string, unknown>): string[] => (Array.isArray(words) ? words.map(String) : []);

const holding = (written: readonly string[], words: readonly string[]): number =>
  words.filter((word) => written.some((one) => one.toLowerCase().includes(word.toLowerCase()))).length;

// Those that hold more of the words first, ties in start order, as ticket 11 orders them.
function ranked<Item>(
  items: readonly Item[],
  words: readonly string[],
  textOf: (item: Item) => string[],
  start: (item: Item) => number,
): Item[] {
  return items.toSorted((a, b) => holding(textOf(b), words) - holding(textOf(a), words) || start(a) - start(b));
}

const written = ({ title, description }: Pick<LargeGlobalEvent, 'title' | 'description'>): string[] => [
  title,
  description,
];

function globalEventsAt(stage: Stage, input: Record<string, unknown>, world: LargeWorldData): string[] {
  const now = momentOf(world.now);
  const window = windowOf(input);
  // Today's tool takes only days.
  if (window === null || (stage === 'today' && text(input.from) === undefined)) {
    return [];
  }
  const words = wordsOf(input);
  const inWindow = world.globalEvents.filter((event) => eventInWindow(event, window, now));
  const kept =
    stage === 'ticket 11' || words.length === 0
      ? inWindow
      : inWindow.filter((event) => holding(written(event), words) > 0);
  const ordered = ranked(kept, stage === 'ticket 11' ? words : [], written, ({ starts }) => momentOf(starts));
  return ordered.slice(0, MOST_AT[stage]).map(({ key }) => key);
}

function startOfQuest(quest: LargeQuest, events: ReadonlyMap<string, LargeGlobalEvent>): number {
  if ('globalEvent' in quest) {
    const event = events.get(quest.globalEvent);
    return event === undefined ? Number.POSITIVE_INFINITY : momentOf(event.starts);
  }
  return momentOf(quest.starts);
}

// Today's search: every Quest of the Boards with a Sub Quest ahead whose time meets the days, however full, soonest first.
function questsToday(input: Record<string, unknown>, world: LargeWorldData): LargeQuest[] {
  const now = momentOf(world.now);
  const events = eventsByKey(world);
  const first = text(input.from);
  const last = text(input.to);
  const event = text(input.globalEventId);
  return world.quests
    .filter((quest) => {
      if (quest.joinPolicy === 'closed' || quest.asker === 'holds') {
        return false;
      }
      if (event !== undefined && !('globalEvent' in quest && quest.globalEvent === event)) {
        return false;
      }
      const held = 'globalEvent' in quest ? events.get(quest.globalEvent) : undefined;
      const start = startOfQuest(quest, events);
      const end = 'globalEvent' in quest ? (held === undefined ? 0 : endOfEvent(held)) : momentOf(quest.ends);
      if (end <= now) {
        return false;
      }
      return (
        first === undefined ||
        last === undefined ||
        (start < momentOf(`${last}T23:59`) + 60_000 && end >= momentOf(`${first}T00:00`))
      );
    })
    .toSorted((a, b) => startOfQuest(a, events) - startOfQuest(b, events));
}

function questsAfterWork(stage: Stage, input: Record<string, unknown>, world: LargeWorldData): LargeQuest[] {
  const now = momentOf(world.now);
  const events = eventsByKey(world);
  const shared = sharedEvents(world);
  const window = windowOf(input);
  const event = text(input.globalEventId);
  const place = text(input.placeId);
  const radius = typeof input.radius === 'number' ? input.radius : 300;
  const fewest = typeof input.minPlacesLeft === 'number' ? input.minPlacesLeft : 1;
  const words = stage === 'ticket 11' ? wordsOf(input) : [];
  const kept = world.quests.filter((quest) => {
    if (!canBeOffered(quest, shared) || quest.capacity - quest.holders < fewest) {
      return false;
    }
    if (typeof input.capacity === 'number' && quest.capacity !== input.capacity) {
      return false;
    }
    if (event !== undefined && !('globalEvent' in quest && quest.globalEvent === event)) {
      return false;
    }
    if (stage === 'ticket 11' && place !== undefined) {
      const at = positionOf(quest, world, events);
      const from = world.places[place];
      if (at === null || from === undefined || metresBetween(at, from) > radius) {
        return false;
      }
    }
    if ('globalEvent' in quest) {
      const held = events.get(quest.globalEvent);
      return held !== undefined && (window === null ? endOfEvent(held) >= now : eventInWindow(held, window, now));
    }
    const start = momentOf(quest.starts);
    return start >= now && (window === null || (start >= momentOf(window.from) && start <= momentOf(window.to)));
  });
  return ranked(kept, words, written, (quest) => startOfQuest(quest, events));
}

export function answeredAt(stage: Stage, { tool, input }: IntendedCall, world: LargeWorldData): string[] {
  if (tool === 'searchGlobalEvents') {
    return globalEventsAt(stage, input, world);
  }
  const quests = stage === 'today' ? questsToday(input, world) : questsAfterWork(stage, input, world);
  return quests.slice(0, MOST_AT[stage]).map(({ key }) => key);
}

// What a case's server recall waits for: nothing, a ticket, or search stage 1, the misspelt posts that no word brings
// among the 30 candidates of a crowded window (P05 spec, "Further Notes").
export type Until = null | 10 | 11 | 'search stage 1';

export function untilOf(calls: readonly IntendedCall[], expected: readonly string[], world: LargeWorldData): Until {
  const holdsAll = (stage: Stage): boolean => {
    const given = new Set(calls.flatMap((call) => answeredAt(stage, call, world)));
    return expected.every((key) => given.has(key));
  };
  if (holdsAll('today')) {
    return null;
  }
  if (holdsAll('ticket 10')) {
    return 10;
  }
  return holdsAll('ticket 11') ? 11 : 'search stage 1';
}
