/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MapScene, type TimeBand } from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem, onDay } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import { type GatheringNaming, itemAt, mergingLegs, modeOf, type Naming, wayOn, withAnd } from './answer-words.js';
import { type GatheringFit, MINUTE_MS, minutesSaid, type PersonPart } from './gathering.js';

// What the map draws of a plan, and its time band.

const HALF_HOUR_MS = 30 * MINUTE_MS;
// The band reaches this far before a plan's start, unless now is later, and this far past its end.
const BAND_BEFORE_MS = 60 * MINUTE_MS;
const BAND_AFTER_MS = 30 * MINUTE_MS;

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

// From the half hour at or before `earliest` to the half hour at or after `latest`, both in milliseconds.
export function halfHoursAround(earliest: number, latest: number): { from: Date; until: Date } {
  return {
    from: new Date(Math.floor(earliest / HALF_HOUR_MS) * HALF_HOUR_MS),
    until: new Date(Math.ceil(latest / HALF_HOUR_MS) * HALF_HOUR_MS),
  };
}

// What a busy stretch is, never its name: a Class by its Place, a Class without one, or a Sub Quest.
function busyLabel({ isClass, placeId }: DayItem, placeLabel: (placeId: string) => string): string {
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

// The asker's other Friends over the same range as the lanes, each with their walk to the Plan's Place.
export function othersOf(naming: GatheringNaming, placeId: string, from: Date, until: Date): Pick<TimeBand, 'others'> {
  const { others } = naming.args;
  if (others === undefined) {
    return {};
  }
  return {
    others: others.map(({ userId, name, items, walkTo }) => ({
      userId,
      name,
      busy: busyIn(items, from, until, (id) => naming.placeLabel(id)),
      walkMinutes: walkTo(placeId),
    })),
  };
}

// From the half hour at or before the later of now and an hour before the plan's start, to the half hour at or after half
// an hour past its end, reaching out to the half hours around the window the User fixed. `now` is given as it is, even
// outside the range.
export function bandOf(fit: GatheringFit, naming: Naming): TimeBand {
  const { start, end, togetherMinutes } = fit;
  const { now, input } = naming.args;
  const opens = [Math.max(now.getTime(), start.getTime() - BAND_BEFORE_MS)];
  const closes = [end.getTime() + BAND_AFTER_MS];
  if (input.window.from !== null) {
    opens.push(onDay(input.date, input.window.from).getTime());
  }
  if (input.window.until !== null) {
    closes.push(onDay(input.date, input.window.until).getTime());
  }
  const { from, until } = halfHoursAround(Math.min(...opens), Math.max(...closes));
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: lanesOf(naming, from, until),
    ...othersOf(naming, fit.placeId, from, until),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)}${minutesSaid(fit) ? ` · 식사 ${togetherMinutes}분` : ''}`,
  };
}
