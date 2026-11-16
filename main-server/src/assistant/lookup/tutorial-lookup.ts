/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shownMinutes } from '../../travel/travel.js';
import { type TutorialVisit } from '../../tutorial/tutorial-content.js';
import { type Lookup } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem, onDay, weekdayOf } from '../free-time/free-time.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { NO_NEXT_CLOSING, type Order, orderOf, type Span, STOP_MINUTES } from './tutorial-order.js';
import {
  type Drawn,
  type LeftReason,
  type LeftWords,
  type Located,
  leftWords,
  lookupOf,
  type Next,
  type OpenQuest,
  type TutorialArgs,
  type TutorialWords,
  wordsOf,
} from './tutorial-words.js';
import { startOf, type WayStart } from './way.js';

export { type OpenQuest, type TutorialArgs } from './tutorial-words.js';

// The Tutorial Quests the User has not completed, in the order that fits before their next item: where the User sets
// out from and when, where each quest is done and when it is open that day, and the order that ends first. Only the
// words are sent to the model.

export type TutorialAnswer =
  | { result: 'found'; start: WayStart; lookup: Lookup; words: TutorialWords }
  | { result: 'none'; reason: 'no-start' | 'no-quests' | 'no-fit'; leftOut: LeftWords[]; online: string[] };

const GATE = '정문';

// The quest's first place: a Place by its name and floor, or a point by its label.
export function locate(
  quest: OpenQuest,
  { placeIdOf, placeOf }: Pick<TutorialArgs, 'placeIdOf' | 'placeOf'>,
): Located | null {
  const [first] = quest.places;
  const placeId = first === undefined ? null : placeIdOf(first);
  if (first === undefined || placeId === null) {
    return null;
  }
  if ('point' in first) {
    return { quest, placeId, at: first.point, words: first.label };
  }
  const { name, latitude, longitude } = placeOf(placeId);
  const words = first.floor === undefined ? name : `${name} ${first.floor}층`;
  return { quest, placeId, at: { latitude, longitude }, words };
}

// The hours the place is open that day, or null when the content gives none.
export function spansOn(visit: TutorialVisit | null, date: string): Span[] | null {
  const hours = visit?.hours;
  if (hours === undefined) {
    return null;
  }
  const weekday = weekdayOf(date);
  return hours
    .filter(({ days }) => days === undefined || days.includes(weekday))
    .flatMap(({ open }) => open.map(({ from, until }) => ({ from: onDay(date, from), until: onDay(date, until) })))
    .toSorted((one, other) => one.from.getTime() - other.from.getTime());
}

// An item that starts within the minute counts as begun: no stop fits before it.
function readyAt(items: readonly DayItem[], now: Date): Date {
  const rounded = new Date(Math.ceil(now.getTime() / MINUTE_MS) * MINUTE_MS);
  return items
    .filter(({ start, end }) => start <= rounded && end > rounded)
    .reduce((ready, { end }) => (end > ready ? end : ready), rounded);
}

// The next item of any kind, since the User is busy then whether or not it has a Place.
export function nextIn(items: readonly DayItem[], at: Date, naming: PlaceNaming): Next | null {
  const item = items.filter(({ start }) => start > at).toSorted(byStart)[0];
  if (item === undefined) {
    return null;
  }
  const { placeId } = item;
  const due = `${clockOf(item.start)}${item.isClass ? ' 수업' : ''}`;
  return { item, placeId, due, label: placeId === null ? null : naming.placeLabel(placeId) };
}

interface Setting {
  start: WayStart;
  setOut: Date;
  next: Next | null;
  located: ReadonlyMap<string, Located>;
}

// Every stop at the Place of its quest, open that day as the content says, each given the same minutes.
function orderFor({ now, travel }: TutorialArgs, { start, setOut, next, located }: Setting): Order {
  const date = koreaDate(now);
  return orderOf({
    from: { placeId: start.placeId, at: setOut },
    until: next === null ? null : { placeId: next.placeId, at: next.item.start },
    closing: onDay(date, NO_NEXT_CLOSING),
    stops: [...located.values()].map(({ quest, placeId }) => ({
      key: quest.key,
      placeId,
      stayMinutes: STOP_MINUTES,
      open: spansOn(quest.visit, date),
    })),
    walkMinutes: (from, to) => (from === to ? 0 : shownMinutes(travel.walkingSeconds(from, to))),
  });
}

function leftOf(
  order: Order,
  located: ReadonlyMap<string, Located>,
  placed: readonly OpenQuest[],
): { quest: OpenQuest; reason: LeftReason }[] {
  return [
    ...order.left.flatMap(({ stop, reason }) => {
      const where = located.get(stop.key);
      return where === undefined ? [] : [{ quest: where.quest, reason }];
    }),
    ...placed.filter(({ key }) => !located.has(key)).map((quest) => ({ quest, reason: 'unmapped' as const })),
  ];
}

export function tutorialAnswer(args: TutorialArgs): TutorialAnswer {
  const { now, me, quests } = args;
  const online = quests.filter(({ places }) => places.length === 0).map(({ title }) => title);
  const placed = quests.filter(({ places }) => places.length > 0);
  if (placed.length === 0) {
    return { result: 'none', reason: 'no-quests', leftOut: [], online };
  }
  const setOut = readyAt(me.items, now);
  const start = startOf({ ...args, me, now: setOut });
  if (start === null) {
    return { result: 'none', reason: 'no-start', leftOut: [], online };
  }
  const naming = new PlaceNaming(args.placeOf);
  const next = nextIn(me.items, setOut, naming);
  const located = new Map(
    placed.flatMap((quest) => {
      const where = locate(quest, args);
      return where === null ? [] : [[quest.key, where] as const];
    }),
  );
  const order = orderFor(args, { start, setOut, next, located });
  const left = leftOf(order, located, placed);
  const leftOut = left.map(({ quest, reason }) => leftWords(quest, reason, next));
  const visits = order.visits.flatMap((visit) => {
    const where = located.get(visit.stop.key);
    return where === undefined ? [] : [{ visit, located: where }];
  });
  const [first] = visits;
  const last = visits.at(-1);
  if (first === undefined || last === undefined) {
    return { result: 'none', reason: 'no-fit', leftOut, online };
  }
  const drawn: Drawn = { args, start, visits, doneAt: last.visit.end, order, left, online, next, naming };
  const from = start.basis === 'gate' ? GATE : naming.placeLabel(start.placeId);
  return { result: 'found', start, lookup: lookupOf(drawn, from, first.located), words: wordsOf(drawn, from, leftOut) };
}
