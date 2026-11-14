/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type MapScene, type TimeBand } from '../dto/answer.dto.js';
import { byStart, clockOf, onDay } from '../free-time/free-time.js';
import { koreaTime } from '../korea-time.js';
import { itemAt, mergingLegs, type Naming, wayOn, withAnd } from './answer-words.js';
import { type GatheringFit, MINUTE_MS, type PersonPart } from './gathering.js';

// What the map draws of a plan, and its time band.

const HALF_HOUR_MS = 30 * MINUTE_MS;
// The band reaches this far before a plan's start, unless now is later, and this far past its end.
const BAND_BEFORE_MS = 60 * MINUTE_MS;
const BAND_AFTER_MS = 30 * MINUTE_MS;

function scenePerson({ personId, origin, walkMinutes }: PersonPart, naming: Naming): MapScene['people'] {
  if (origin === null) {
    return [];
  }
  const person = naming.personOf(personId);
  const exact = origin.basis === 'location' ? person.position : null;
  const label = person.me ? '나' : person.name;
  return [
    {
      userId: person.userId,
      name: person.name,
      me: person.me,
      at: exact ?? naming.position(origin.placeId),
      source: exact === null ? 'timetable' : 'exact',
      tag: walkMinutes !== null && walkMinutes > 0 ? `${label} · ${walkMinutes}분` : label,
    },
  ];
}

function scenePlaces(fit: GatheringFit, naming: Naming): MapScene['places'] {
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
function routes({ placeId, meeting, parts }: GatheringFit, naming: Naming): MapScene['routes'] {
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
    ways.push({ userId: mine.personId, role: 'me', from, to, minutes: mine.walkMinutes });
  }
  for (const part of theirs) {
    const { personId, origin, walkMinutes } = part;
    if (mergingLegs(part, meeting) === null && origin !== null && walkMinutes !== null) {
      ways.push({ userId: personId, role: 'friend', from: naming.position(origin.placeId), to, minutes: walkMinutes });
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
    });
  }
  return ways.filter(({ minutes }) => minutes > 0);
}

function flags({ placeId, start, meeting }: GatheringFit, naming: Naming): MapScene['flags'] {
  const all: MapScene['flags'] = [
    { at: naming.position(placeId), text: `${clockOf(start)} ${naming.mealWord()}`, role: 'place' },
  ];
  if (meeting !== null) {
    const names = meeting.personIds.slice(1).map((personId) => naming.personOf(personId).name);
    const last = names.pop() ?? '';
    const met = [...names, withAnd(last)].join(', ');
    all.push({ at: naming.position(meeting.placeId), text: `${clockOf(meeting.at)} ${met} 만남`, role: 'meeting' });
  }
  return all;
}

export function sceneOf(fit: GatheringFit, naming: Naming): MapScene {
  return {
    people: fit.parts.flatMap((part) => scenePerson(part, naming)),
    places: scenePlaces(fit, naming),
    routes: routes(fit, naming),
    flags: flags(fit, naming),
  };
}

// From the half hour at or before the later of now and an hour before the plan's start, to the half hour at or after half
// an hour past its end, reaching out to the half hours around the window the User fixed. `now` is given as it is, even
// outside the range.
export function bandOf({ start, end, togetherMinutes }: GatheringFit, naming: Naming): TimeBand {
  const { now, people, input } = naming.args;
  const opens = [Math.max(now.getTime(), start.getTime() - BAND_BEFORE_MS)];
  const closes = [end.getTime() + BAND_AFTER_MS];
  if (input.window.from !== null) {
    opens.push(onDay(input.date, input.window.from).getTime());
  }
  if (input.window.until !== null) {
    closes.push(onDay(input.date, input.window.until).getTime());
  }
  const from = new Date(Math.floor(Math.min(...opens) / HALF_HOUR_MS) * HALF_HOUR_MS);
  const until = new Date(Math.ceil(Math.max(...closes) / HALF_HOUR_MS) * HALF_HOUR_MS);
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(now),
    lanes: people.map(({ userId, name, me, items }) => ({
      userId,
      name: me ? '나' : name,
      busy: items
        .filter((item) => item.start < until && item.end > from)
        .toSorted(byStart)
        .map((item) => ({
          startAt: koreaTime(item.start < from ? from : item.start),
          endAt: koreaTime(item.end > until ? until : item.end),
        })),
    })),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${clockOf(start)}–${clockOf(end)} · 식사 ${togetherMinutes}분`,
  };
}
