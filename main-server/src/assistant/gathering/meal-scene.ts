/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MapScene, type TimeBand } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem } from '../free-time/free-time.js';
import { type Interval, mealWindow } from '../free-time/meal-fit.js';
import { bandRange, mealBounds, windowHolds } from '../free-time/band-range.js';
import { koreaTime } from '../korea-time.js';
import {
  type GatheringNaming,
  itemAt,
  mergingLegs,
  modeOf,
  type Naming,
  type OtherFriend,
  wayOn,
  withAnd,
} from './answer-words.js';
import { type GatheringFit, minutesSaid, type PersonPart } from './gathering.js';
import { freedReach } from './meal-plan-parts.js';
import { skippedBand } from '../free-time/left-out-classes.js';
import { type SetOut, setOutOf } from './other-friends.js';

// What the map draws of a plan, and its time band.

function scenePerson({ personId, origin, walkMinutes }: PersonPart, naming: GatheringNaming): MapScene['people'] {
  if (origin === null) {
    return [];
  }
  const person = naming.personOf(personId);
  const located = origin.basis === 'location';
  // A Friend the asker sees only at the building has a location Place and no position.
  const exact = located ? person.position : null;
  const label = person.me ? '나' : person.name;
  return [
    {
      userId: person.userId,
      name: person.name,
      me: person.me,
      at: exact ?? naming.position(origin.placeId),
      source: exact === null ? (located ? 'building' : 'timetable') : 'exact',
      tag: walkMinutes !== null && walkMinutes > 0 ? `${label} · ${walkMinutes}분` : label,
    },
  ];
}

function scenePlaces(fit: GatheringFit, naming: GatheringNaming): MapScene['places'] {
  const { gathering } = naming.args;
  const places: MapScene['places'] = [
    { place: naming.labelledPoint(fit.placeId, fit.key), role: 'pick', tag: fit.key },
  ];
  for (const other of gathering.fits) {
    if (other !== fit) {
      places.push({ place: naming.labelledPoint(other.placeId, other.key), role: 'candidate', tag: other.key });
    }
  }
  for (const drop of gathering.dropped) {
    const tag = `${drop.key} · ${naming.dropReason(drop)}`;
    places.push({ place: naming.labelledPoint(drop.placeId, drop.key), role: 'dropped', tag });
  }
  const next = fit.parts[0]?.next ?? null;
  if (next !== null && next.placeId !== null) {
    const clock =
      itemAt(naming.asker.items, next)?.isClass === true ? `${clockOf(next.start)} 수업` : clockOf(next.start);
    const tag = `${clock} · ${naming.placeLabel(next.placeId)}`;
    places.push({ place: naming.placePoint(next.placeId), role: 'next', tag });
  }
  if (fit.meeting !== null) {
    places.push({ place: naming.placePoint(fit.meeting.placeId), role: 'meeting', tag: null });
  }
  return places;
}

// A merging Friend to the meeting, the asker on to the place, a Friend who does not merge to the place, and the asker
// on to their next item.
function routes({ placeId, meeting, parts }: GatheringFit, naming: GatheringNaming): MapScene['routes'] {
  const [mine, ...theirs] = parts;
  const to = naming.position(placeId);
  const ways: MapScene['routes'] = [];
  for (const part of theirs) {
    const { personId, origin } = part;
    const legs = mergingLegs(part, meeting);
    if (legs !== null && meeting !== null && origin !== null) {
      const [from, meetAt] = [naming.position(origin.placeId), naming.position(meeting.placeId)];
      ways.push({ userId: personId, role: 'friend', from, to: meetAt, minutes: legs.toMeeting });
    }
  }
  if (mine !== undefined && mine.origin !== null && mine.walkMinutes !== null) {
    const from = naming.position(meeting?.placeId ?? mine.origin.placeId);
    ways.push({ userId: mine.personId, role: 'me', from, to, minutes: mine.walkMinutes, ...modeOf(mine) });
  }
  for (const part of theirs) {
    const { personId, origin, walkMinutes } = part;
    if (mergingLegs(part, meeting) === null && origin !== null && walkMinutes !== null) {
      const from = naming.position(origin.placeId);
      ways.push({ userId: personId, role: 'friend', from, to, minutes: walkMinutes, ...modeOf(part) });
    }
  }
  const onward = wayOn(mine);
  if (mine !== undefined && onward !== null) {
    ways.push({
      userId: mine.personId,
      role: 'next',
      from: to,
      to: naming.position(onward.placeId),
      minutes: onward.minutes,
      ...modeOf(onward),
    });
  }
  return ways.filter(({ minutes }) => minutes > 0);
}

// `word` is what the people gather for: the meal, or 만남.
function flags({ placeId, start, meeting }: GatheringFit, naming: GatheringNaming, word: string): MapScene['flags'] {
  const all: MapScene['flags'] = [{ at: naming.position(placeId), text: `${clockOf(start)} ${word}`, role: 'place' }];
  if (meeting !== null) {
    const names = meeting.personIds.slice(1).map((personId) => naming.personOf(personId).name);
    const last = names.pop() ?? '';
    const met = [...names, withAnd(last)].join(', ');
    all.push({ at: naming.position(meeting.placeId), text: `${clockOf(meeting.at)} ${met} 만남`, role: 'meeting' });
  }
  return all;
}

export function sceneOf(fit: GatheringFit, naming: GatheringNaming, word: string): MapScene {
  return {
    people: fit.parts.flatMap((part) => scenePerson(part, naming)),
    places: scenePlaces(fit, naming),
    routes: routes(fit, naming),
    flags: flags(fit, naming, word),
  };
}

// What a busy stretch is, never its name: a Class by its Place, a Class without one, or a Sub Quest.
export function busyLabel({ isClass, placeId }: DayItem, placeLabel: (placeId: string) => string): string {
  if (!isClass) {
    return '일정';
  }
  return placeId === null ? '수업' : `${placeLabel(placeId)} 수업`;
}

// A lane's items in the range, cut to it, without their names. A Plan's band labels each by what it is.
export function busyIn(
  items: readonly DayItem[],
  from: Date,
  until: Date,
  placeLabel?: (placeId: string) => string,
): TimeBand['lanes'][number]['busy'] {
  return items
    .filter((item) => item.start < until && item.end > from)
    .toSorted(byStart)
    .map((item) => {
      const startAt = koreaTime(item.start < from ? from : item.start);
      const endAt = koreaTime(item.end > until ? until : item.end);
      return placeLabel === undefined ? { startAt, endAt } : { startAt, endAt, label: busyLabel(item, placeLabel) };
    });
}

// How long the meal lasts. It ends when someone must leave, at the end the User set, or an hour after its start, so it
// is always said in minutes. A Restaurant's closing is when it last serves, which ends no meal (P05 ticket 46).
export function mealSpan({ togetherMinutes }: GatheringFit): string {
  return `식사 ${togetherMinutes}분`;
}

// Each person's lane over the range, the asker's named 나.
export function lanesOf(naming: GatheringNaming, from: Date, until: Date): TimeBand['lanes'] {
  return naming.args.people.map(({ userId, name, me, items }) => ({
    userId,
    name: me ? '나' : name,
    busy: busyIn(items, from, until, (placeId) => naming.placeLabel(placeId)),
  }));
}

// The asker's other Friends over the same range as the lanes, each with their walk to the Plan's Place from where they
// set out for it (`setOutOf`), and the item they set out after, said as a lane's busy stretch (P04 ticket 68).
export function othersOf(
  naming: GatheringNaming,
  { placeId, start, end }: Pick<GatheringFit, 'placeId' | 'start' | 'end'>,
  from: Date,
  until: Date,
): Pick<TimeBand, 'others'> {
  const { others, input, now } = naming.args;
  if (others === undefined) {
    return {};
  }
  const label = (id: string): string => naming.placeLabel(id);
  const at = { date: input.date, now, placeId };
  return {
    others: others.map((other) => otherLane(other, setOutOf(other, { start, end }, at), { from, until, label })),
  };
}

export function otherLane(
  { userId, name, items }: OtherFriend,
  { walkMinutes, after }: SetOut,
  { from, until, label }: { from: Date; until: Date; label: (placeId: string) => string },
): NonNullable<TimeBand['others']>[number] {
  const busy = busyIn(items, from, until, label);
  return after === null
    ? { userId, name, busy, walkMinutes }
    : { userId, name, busy, walkMinutes, after: busyLabel(after, label) };
}

// The asker's Classes left out of the plan, whole, labelled as a lane's busy stretch.
export function skippedOf(items: readonly DayItem[], naming: Naming): NonNullable<TimeBand['skipped']> {
  return skippedBand(items, (item) => busyLabel(item, (placeId) => naming.placeLabel(placeId))).skipped ?? [];
}

// The meal's window, wider where the plan's Restaurant serves longer; never narrower, as the Restaurant's own window may
// be the one the User fixed.
function servedWindow(meal: Interval, own: Interval | undefined): Interval {
  return own === undefined
    ? meal
    : { start: own.start < meal.start ? own.start : meal.start, end: own.end > meal.end ? own.end : meal.end };
}

// The one range of a time card (`bandRange`) between a meal's own bounds (`mealBounds`, P01 ticket 46): the stretch the
// asker can eat the meal in, between their items and while it is served, so that a lunch can be dragged anywhere it can
// be eaten that day. It reaches out to the window the User fixed, and over the time a Class left out frees. `now` is
// given as it is, even outside the range.
export function bandOf(fit: GatheringFit, naming: Naming): TimeBand {
  const { start, end, togetherMinutes } = fit;
  const { now, input } = naming.args;
  const { items, skipped = [] } = naming.asker;
  const meal = mealWindow(input.date, input.meal);
  const freed = skipped.length > 0 ? [freedReach(items, skipped, meal.end)] : [];
  const span = { start, end };
  const holds = [...windowHolds(input.date, input.window), ...freed];
  const bounds = mealBounds(span, servedWindow(meal, fit.window), items);
  const { from, until } = bandRange({ now, date: input.date, span, bounds, holds });
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: lanesOf(naming, from, until),
    ...othersOf(naming, fit, from, until),
    ...(skipped.length === 0 ? {} : { skipped: skippedOf(skipped, naming) }),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)}${minutesSaid(fit) ? ` · 식사 ${togetherMinutes}분` : ''}`,
  };
}
