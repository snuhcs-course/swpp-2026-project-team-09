/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, LibraryCardData, LibrarySpace, MapScene, Plan, PlacePoint } from '@/api/assistant-types';
import { withLibraryDefaults } from '@/api/server/library-card-answers';
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
  // The card is a study answer's 관정관 opened (P10 ticket 27): the opened place holds it, not the reply's cards, so the
  // reply's words stay.
  inPlan?: true;
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

// 관정관 opened from a study answer alone (P10 tickets 22 and 27): its Plan's book card is the booking on the map, as
// a seat card the reply gave alone is, so that the opened place is the framed seat answer's: the one time card on top,
// which the ticket books, the ticket, and 예약하기 beside the input. Null for any other place, or the list.
export function studyBookingOf(
  shown: { plan: Plan | null; menuFor: string | null; source: AnswerReply | null },
  bubbles: readonly ChatBubble[],
  places: readonly Place[],
  outcomeOf: (place: string) => CardOutcome | null,
): ShownBooking | null {
  const { plan, menuFor, source } = shown;
  const book = plan?.study?.book ?? null;
  if (plan === null || menuFor !== plan.id || book === null || source === null) {
    return null;
  }
  const reply = bubbles.findLast(({ answer }) => answer === source);
  const card = withLibraryDefaults(book.card);
  const { space } = card;
  if (reply === undefined || card.action !== 'book' || space === null || space.unit !== 'seat') {
    return null;
  }
  const place = cardPlace(reply.id, card.key);
  const outcome = outcomeOf(place);
  const building = places.find(({ number }) => number === space.placeNumber);
  const booked = outcome?.kind === 'booked';
  if ((outcome !== null && outcome.kind !== 'pending' && !booked) || building === undefined) {
    return null;
  }
  const { id, latitude, longitude } = building;
  const point = { placeId: id, label: building.name, latitude, longitude };
  return { bubbleId: reply.id, place, card, space, point, booked, inPlan: true };
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

// The pick's second line (P01 ticket 10): what is known of the seat and the free seats ("7800번 · 빈 자리 171석"), or the
// seat and "예약됨" once booked; null when nothing is known, never an empty value.
export function studyLine(seat: string | null, free: number | null, booked: boolean): string | null {
  const parts = [
    ...(seat === null ? [] : [seatWords(seat)]),
    ...(booked ? ['예약됨'] : free === null ? [] : [`빈 자리 ${String(free)}석`]),
  ];
  return parts.length === 0 ? null : parts.join(' · ');
}

// The scene the app makes for a booking: the pick on the building with the room, and `line` under it, which opens its
// card, and the User at `me` with a walk there.
export function bookingScene(point: PlacePoint, space: LibrarySpace, line: string | null, me: LatLng | null): MapScene {
  const at = { latitude: point.latitude, longitude: point.longitude };
  const { mine, walk } = meAndWalk(me, at);
  return {
    people: mine,
    places: [{ place: point, role: 'pick', tag: bookingTitle(space) }],
    routes: walk,
    flags: line === null ? [] : [{ at, text: line, role: 'place' }],
  };
}

export const BOOKING_SETTING: SceneSetting = { number: null, plans: [], standings: NO_STANDINGS };

// A booking's setting: its pick the study one, with the booking's start (P01 ticket 10).
export function studySetting(start: string): SceneSetting {
  return { ...BOOKING_SETTING, study: start };
}
