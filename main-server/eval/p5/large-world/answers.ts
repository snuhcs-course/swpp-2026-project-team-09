/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { metresBetween, type Position } from '../../../src/common/geometry.ts';
import { type LargeGlobalEvent, type LargeQuest, type LargeWorldData } from './world-data.ts';

// What each question of the large world expects (P05 ticket 02b), computed from the attributes by the rules of
// eval/p5/rules.md, never by the app's search, so that a change to it cannot change the answers. Only the generator calls
// this, once per version; the answers are then stored with the cases, and a run only reads them.

// Times are in Korea as YYYY-MM-DDTHH:MM. A window holds both of its ends (rules.md, section 2).
export interface Window {
  from: string;
  to: string;
}

export interface QuestCondition {
  window: Window;
  // The activities that count; left out, every activity.
  activities?: readonly string[];
  capacity?: number;
  minPlacesLeft?: number;
  near?: { place: string; metres: number };
  // A question about this event's 파티: its Quests, and those with no Global Event of its activity within its span.
  forEvent?: string;
}

export interface EventCondition {
  window: Window;
  activities?: readonly string[];
  titleHolds?: string;
  titleLacks?: string;
}

export interface Conditions {
  quests?: QuestCondition;
  events?: EventCondition;
}

export interface Answer {
  quests: string[];
  globalEvents: string[];
}

export const CAPACITY_OF_A_REPLY = 20;

export const momentOf = (time: string): number => Date.parse(`${time}+09:00`);

// When an event ends: its end, or the end of its start's day (rules.md, section 2).
export function endOfEvent({ starts, ends }: Pick<LargeGlobalEvent, 'starts' | 'ends'>): number {
  return momentOf(ends ?? `${starts.slice(0, 10)}T23:59`);
}

export function eventInWindow(event: LargeGlobalEvent, window: Window, now: number): boolean {
  const end = endOfEvent(event);
  return end >= now && momentOf(event.starts) <= momentOf(window.to) && end >= momentOf(window.from);
}

export function eventsByKey({ globalEvents }: LargeWorldData): Map<string, LargeGlobalEvent> {
  return new Map(globalEvents.map((event) => [event.key, event]));
}

// The events of which the asker holds a Shared Quest.
export function sharedEvents({ quests }: LargeWorldData): Set<string> {
  return new Set(
    quests.flatMap((quest) =>
      'globalEvent' in quest && quest.asker === 'holds' && quest.holders >= 2 ? [quest.globalEvent] : [],
    ),
  );
}

// What is never offered, whatever was asked (rules.md, section 3), but for its time.
export function canBeOffered(quest: LargeQuest, shared: ReadonlySet<string>): boolean {
  return (
    quest.joinPolicy !== 'closed' &&
    quest.holders < quest.capacity &&
    quest.asker === 'none' &&
    !('globalEvent' in quest && shared.has(quest.globalEvent))
  );
}

// Where a Quest is, or null when it has words only (rules.md, section 1).
export function positionOf(
  quest: LargeQuest,
  { places }: LargeWorldData,
  events: ReadonlyMap<string, LargeGlobalEvent>,
): Position | null {
  if ('globalEvent' in quest) {
    return events.get(quest.globalEvent) ?? null;
  }
  const { place } = quest;
  if (place === null) {
    return null;
  }
  if ('seed' in place) {
    return places[place.seed] ?? null;
  }
  return 'latitude' in place ? place : null;
}

function questInWindow(
  quest: LargeQuest,
  window: Window,
  now: number,
  events: ReadonlyMap<string, LargeGlobalEvent>,
): boolean {
  if ('globalEvent' in quest) {
    const event = events.get(quest.globalEvent);
    return event !== undefined && eventInWindow(event, window, now);
  }
  const start = momentOf(quest.starts);
  return start >= now && start >= momentOf(window.from) && start <= momentOf(window.to);
}

function matchesEventQuestion(quest: LargeQuest, forEvent: LargeGlobalEvent, now: number): boolean {
  if ('globalEvent' in quest) {
    return quest.globalEvent === forEvent.key && endOfEvent(forEvent) >= now;
  }
  const start = momentOf(quest.starts);
  return (
    quest.activity === forEvent.activity &&
    start >= now &&
    start >= momentOf(forEvent.starts) &&
    start <= endOfEvent(forEvent)
  );
}

function questsOf(condition: QuestCondition, world: LargeWorldData): string[] {
  const now = momentOf(world.now);
  const events = eventsByKey(world);
  const shared = sharedEvents(world);
  const { window, activities, capacity, minPlacesLeft = 1, near, forEvent } = condition;
  const named = forEvent === undefined ? undefined : events.get(forEvent);
  if (forEvent !== undefined && named === undefined) {
    throw new Error(`The world has no Global Event ${forEvent}`);
  }
  const placed = near === undefined ? undefined : world.places[near.place];
  if (near !== undefined && placed === undefined) {
    throw new Error(`The world has no Place ${near.place}`);
  }
  return world.quests
    .filter((quest) => {
      if (!canBeOffered(quest, shared)) {
        return false;
      }
      if (named === undefined ? !questInWindow(quest, window, now, events) : !matchesEventQuestion(quest, named, now)) {
        return false;
      }
      if (activities !== undefined && !activities.includes(quest.activity)) {
        return false;
      }
      if (capacity !== undefined && quest.capacity !== capacity) {
        return false;
      }
      if (quest.capacity - quest.holders < minPlacesLeft) {
        return false;
      }
      if (placed === undefined || near === undefined) {
        return true;
      }
      const position = positionOf(quest, world, events);
      return position !== null && metresBetween(position, placed) <= near.metres;
    })
    .map(({ key }) => key);
}

function eventsOf(condition: EventCondition, world: LargeWorldData): string[] {
  const now = momentOf(world.now);
  const { window, activities, titleHolds, titleLacks } = condition;
  return world.globalEvents
    .filter(
      (event) =>
        eventInWindow(event, window, now) &&
        (activities === undefined || activities.includes(event.activity)) &&
        (titleHolds === undefined || event.title.includes(titleHolds)) &&
        (titleLacks === undefined || !event.title.includes(titleLacks)),
    )
    .map(({ key }) => key);
}

export function answerOf({ quests, events }: Conditions, world: LargeWorldData): Answer {
  return {
    quests: quests === undefined ? [] : questsOf(quests, world),
    globalEvents: events === undefined ? [] : eventsOf(events, world),
  };
}
