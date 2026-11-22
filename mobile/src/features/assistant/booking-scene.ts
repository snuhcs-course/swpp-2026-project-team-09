/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace, MapScene, PlacePoint } from '@/api/assistant-types';
import type { LatLng, Place } from '@/api/types';
import { koreaDateKey, koreaDayWord } from '@/korea-time';
import { seatWords } from '@/library/cards/bookings';
import type { Slot } from '@/library/cards/payloads';
import { roomTitle } from '@/library/cards/seat-rooms';
import { rangeWords } from '@/library/cards/times';
import type { SceneSetting } from './answer-marks';
import { NO_STANDINGS } from './invited-friends';
import { meAndWalk } from './proposal-scene';
import { turnOf } from './turn';
import { cardPlace, type CardOutcome, type ChatBubble } from './use-chat';

// A 관정도서관 seat card of the turn on screen that the map draws (P04 ticket 07): the bubble it came in, its place in
// the chat by which the chat keeps its room, time, and seat, the card, and the Place its space is in.
export interface ShownBooking {
  bubbleId: number;
  place: string;
  card: LibraryCardData;
  space: LibrarySpace;
  point: PlacePoint;
  // Booked: the map keeps it with "· 예약됨" until 확인 closes the answer (P01 ticket 03).
  booked: boolean;
}

// The seat card the turn on screen replied with alone, while it is open and its space's building is in the list of
// Places. A reply that also holds a Plan, a Lookup, or several requests keeps its own drawing and the card its own
// buttons, unless the card is one of the steps; a room card (스터디룸, 스튜디오) keeps its card.
export function shownBookingOf(
  bubbles: readonly ChatBubble[],
  places: readonly Place[],
  outcomeOf: (place: string) => CardOutcome | null,
): ShownBooking | null {
  const after = turnOf(bubbles)?.after ?? [];
  const [reply, then] = after;
  const [card] = reply?.cards ?? [];
  // The reply alone, or followed by its booking's done message (P01 ticket 03).
  const alone = after.length === 1 || (after.length === 2 && then?.done !== undefined);
  if (!alone || reply === undefined || reply.cards.length !== 1 || card?.kind !== 'library') {
    return null;
  }
  // A seat card that is one of several requests is that step's: the steps draw it, and its 예약하기 is the step's
  // button while it is the step shown (P04 ticket 09).
  const key = card.library.key;
  const aStep = (reply.steps ?? []).some(({ shows }) => shows?.kind === 'card' && shows.key === key);
  if (!aStep && ((reply.answer ?? null) !== null || (reply.lookup ?? null) !== null || reply.steps !== undefined)) {
    return null;
  }
  const { library } = card;
  const { space } = library;
  if (library.action !== 'book' || space === null || space.unit !== 'seat') {
    return null;
  }
  const place = cardPlace(reply.id, library.key);
  const outcome = outcomeOf(place);
  const building = places.find(({ number }) => number === space.placeNumber);
  const booked = outcome?.kind === 'booked';
  if ((outcome !== null && outcome.kind !== 'pending' && !booked) || building === undefined) {
    return null;
  }
  const { id, latitude, longitude } = building;
  return {
    bubbleId: reply.id,
    place,
    card: library,
    space,
    point: { placeId: id, label: building.name, latitude, longitude },
    booked,
  };
}

// "관정 7층 열람실": the room's chip words, or its floor and short name.
export function bookingTitle(space: LibrarySpace): string {
  return roomTitle(space);
}

// The flag's second line: the seat, its day when it is not today, and the booking's time ("7233번 14:00–16:30").
export function bookingLine(seat: string | null, slot: Slot, now: Date): string {
  const day = slot.date === koreaDateKey(now) ? '' : `${koreaDayWord(`${slot.date}T12:00:00+09:00`, now)} `;
  return `${seat === null ? '' : `${seatWords(seat)} `}${day}${rangeWords(slot.start, slot.minutes)}`;
}

// The scene the app makes for a booking: the flag on the building with the room, the seat, and the time, which opens its
// card, and the User at `me` with a walk there.
export function bookingScene(point: PlacePoint, space: LibrarySpace, line: string, me: LatLng | null): MapScene {
  const at = { latitude: point.latitude, longitude: point.longitude };
  const { mine, walk } = meAndWalk(me, at);
  return {
    people: mine,
    places: [{ place: point, role: 'pick', tag: `${bookingTitle(space)} ›` }],
    routes: walk,
    flags: [{ at, text: line, role: 'place' }],
  };
}

export const BOOKING_SETTING: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS };
