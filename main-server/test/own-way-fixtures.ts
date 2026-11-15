/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';
import { type OwnWay } from '../src/plans/dto/invitation-card.dto.js';
import { type CardStep, gatheringOf, type OwnWayArgs, ownWay } from '../src/plans/own-way.js';
import { at } from './gathering-fixtures.js';

// Steps, Places, and a call of the invitee's way for the unit tests of the invitee's own way.

export const step = (title: string, start: Date | null, end: Date | null, placeId: string | null): CardStep => ({
  id: title,
  title,
  start,
  end,
  placeId,
  ended: false,
});

export type WayCall = Partial<Omit<OwnWayArgs, 'gathered' | 'items'>> &
  Pick<OwnWayArgs, 'travel' | 'placeOf' | 'now'> & { lateMinutes?: number };

// The way of the invitee 민수 with the Leader 유상, unless `more` says otherwise.
export function wayOf(steps: CardStep[], items: DayItem[], { lateMinutes, ...more }: WayCall): OwnWay {
  const gathered = gatheringOf(steps, more.travel);
  if (gathered === null) {
    throw new Error('The steps have no gathering');
  }
  return ownWay(
    {
      gathered,
      items,
      invitee: { id: 'invitee', name: '민수' },
      leaderName: '유상',
      location: null,
      ...more,
    },
    lateMinutes,
  );
}

// Hand-made Places: the invitee's Class at O, the meeting at M, the meal at P, the next item at N, and a location at L.
const HAND_LATITUDES: Record<string, number> = { O: 37.45, M: 37.451, P: 37.452, N: 37.453, L: 37.454 };

export function handPlace(placeId: string): PlaceDto {
  const latitude = HAND_LATITUDES[placeId];
  if (latitude === undefined) {
    throw new Error(`No hand-made Place ${placeId}`);
  }
  return { id: placeId, number: null, name: `${placeId}관`, latitude, longitude: 126.95 };
}

export const HAND = { placeOf: handPlace, now: at('11:30') };

// A meeting at M from 12:00, 10 minutes from the meal at P from 12:10.
export const meetingThenMeal = (): CardStep[] => [
  step('유상, 민수: M관 앞에서 만나기', at('12:00'), at('12:10'), 'M'),
  step('P관에서 식사', at('12:10'), at('12:40'), 'P'),
];

export const mealAtP = (): CardStep[] => [step('P관에서 식사', at('12:10'), at('12:40'), 'P')];
