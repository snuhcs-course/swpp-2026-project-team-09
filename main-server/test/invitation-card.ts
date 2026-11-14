/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Named, type Place } from './meal-plan.js';
import { ANY_STRING } from './signals.js';

// Expected parts of an invitation's card in the worked example, and the positions a reply holds, for the card's
// integration tests.

export type Location = { latitude: number; longitude: number };

// The worked example's three Places: the meeting, 민수's Class, and the meal.
export interface Places {
  p301: Place;
  p302: Place;
  p63: Place;
}

export const pointOf = ({ id, latitude, longitude }: Place, label: string): object => ({
  placeId: id,
  label,
  latitude,
  longitude,
});

export const positionOf = ({ latitude, longitude }: Place): Location => ({ latitude, longitude });

export const stepOf = (title: string, [startsAt, endsAt]: [string, string], place: Place): object => ({
  id: ANY_STRING,
  title,
  startsAt,
  endsAt,
  place: { placeId: place.id, label: place.name, latitude: place.latitude, longitude: place.longitude },
});

export const minsuWayOf = ({ p301, p302 }: Places): object => ({
  status: 'ok',
  origin: { place: pointOf(p302, '302동'), basis: 'timetable' },
  leaveAt: '2088-04-06T12:15:00+09:00',
  walkMinutes: 18,
  arriveAt: '2088-04-06T12:33:00+09:00',
  meeting: { place: pointOf(p301, '301동'), at: '2088-04-06T12:18:00+09:00' },
  leaveBy: null,
  next: null,
  lines: [
    [
      { text: '12:15에 수업이 끝나면 바로 나서면 돼요.', strong: true },
      { text: ' 걸어서 18분.', strong: false },
    ],
  ],
});

export const minsuSceneOf = (minsu: Named, { p301, p302, p63 }: Places): object => ({
  people: [{ userId: minsu.id, name: '민수', me: true, at: positionOf(p302), source: 'timetable', tag: '나 · 18분' }],
  places: [
    { place: pointOf(p63, '63동'), role: 'pick', tag: null },
    { place: pointOf(p301, '301동'), role: 'meeting', tag: null },
  ],
  routes: [
    { userId: minsu.id, role: 'me', from: positionOf(p302), to: positionOf(p301), minutes: 3 },
    { userId: minsu.id, role: 'me', from: positionOf(p301), to: positionOf(p63), minutes: 15 },
  ],
  flags: [
    { at: positionOf(p63), text: '12:33 학생회관식당에서 식사', role: 'place' },
    { at: positionOf(p301), text: '12:18 유상과 만남', role: 'meeting' },
  ],
});

export const key = ({ latitude, longitude }: Location): string => `${latitude},${longitude}`;

// Every latitude and longitude pair anywhere in a reply.
export function positionsIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const each of value) {
      positionsIn(each, found);
    }
  } else if (typeof value === 'object' && value !== null) {
    const { latitude, longitude } = value as Partial<Location>;
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      found.add(key({ latitude, longitude }));
    }
    for (const each of Object.values(value)) {
      positionsIn(each, found);
    }
  }
  return found;
}
