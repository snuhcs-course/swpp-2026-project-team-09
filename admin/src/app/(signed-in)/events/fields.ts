/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { GlobalEvent, GlobalEventChange, Missing, Place } from '@/main-server';
import { fromSeoul, inSeoul } from '@/seoul-time';

// The form as typed, so that a half-entered value stays on screen.
export interface Fields {
  title: string;
  description: string;
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
  place: string;
  latitude: string;
  longitude: string;
}

export interface Problems {
  title?: string;
  start?: string;
  end?: string;
}

const PLACES_SHOWN = 10;

export const NEEDED: Record<Missing | 'title', string> = {
  title: 'a title',
  startsAt: 'a start',
  position: 'a position',
};

// ['a start', 'a position'] → 'a start and a position'
export function listed(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function fieldsOf(event: GlobalEvent): Fields {
  const start = event.startsAt === null ? { day: '', time: '' } : inSeoul(event.startsAt);
  const end = event.endsAt === null ? { day: '', time: '' } : inSeoul(event.endsAt);
  return {
    title: event.title,
    description: event.description,
    startDay: start.day,
    startTime: start.time,
    endDay: end.day,
    endTime: end.time,
    place: event.place ?? '',
    latitude: event.latitude === null ? '' : String(event.latitude),
    longitude: event.longitude === null ? '' : String(event.longitude),
  };
}

function instant(day: string, time: string): string | null {
  return day === '' || time === '' ? null : fromSeoul({ day, time });
}

export function problemsOf(fields: Fields): Problems {
  const problems: Problems = {};
  if (fields.title.trim() === '') {
    problems.title = 'Enter a title.';
  }
  if ((fields.startDay === '') !== (fields.startTime === '')) {
    problems.start = 'Enter both the day and the time.';
  }
  const startsAt = instant(fields.startDay, fields.startTime);
  const endsAt = instant(fields.endDay, fields.endTime);
  if ((fields.endDay === '') !== (fields.endTime === '')) {
    problems.end = 'Enter both the day and the time.';
  } else if (startsAt !== null && endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt)) {
    problems.end = 'The end must be after the start.';
  }
  return problems;
}

// What publishing still needs, as the main server checks it: a title, a start and a position.
export function neededToPublish(fields: Fields): string[] {
  return [
    ...(fields.title.trim() === '' ? [NEEDED.title] : []),
    ...(instant(fields.startDay, fields.startTime) === null ? [NEEDED.startsAt] : []),
    ...(fields.latitude === '' || fields.longitude === '' ? [NEEDED.position] : []),
  ];
}

export function changeOf(fields: Fields): GlobalEventChange {
  const place = fields.place.trim();
  return {
    title: fields.title.trim(),
    description: fields.description,
    startsAt: instant(fields.startDay, fields.startTime),
    endsAt: instant(fields.endDay, fields.endTime),
    place: place === '' ? null : place,
    latitude: fields.latitude === '' ? null : Number(fields.latitude),
    longitude: fields.longitude === '' ? null : Number(fields.longitude),
  };
}

// By name, whatever the case of its Latin letters, or by number, written with or without 동.
export function placesMatching(places: Place[], query: string): Place[] {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') {
    return [];
  }
  const number = wanted.replace(/동$/u, '');
  return places
    .filter((place) => place.name.toLowerCase().includes(wanted) || place.number === number)
    .slice(0, PLACES_SHOWN);
}
