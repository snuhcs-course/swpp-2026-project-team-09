/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { StudyGroup } from '@/api/study-plan-types';
import type { Slot } from '@/library/cards/payloads';
import { nearestStarts } from '@/library/cards/rooms';
import { dayWords, rangeWords } from '@/library/cards/times';
import type { LibraryRoomTimes } from '@/library/replies';

// The study answer together once everyone has consented (P10 ticket 14; design group-study-design 다 라,
// group-study-resume 5 and 3 나 다 라): the room read again, what the card says, and when the library lets it book.

// A room's number read aloud ends in its last digit: 2, 4, 5 and 9 end in a vowel, 1, 7 and 8 in ㄹ.
const VOWEL_END = new Set(['2', '4', '5', '9']);
const RIEUL_END = new Set(['1', '7', '8']);

const subjectOf = (room: string): string => `${room}${VOWEL_END.has(room.at(-1) ?? '') ? '가' : '이'}`;
const towardOf = (room: string): string => {
  const last = room.at(-1) ?? '';
  return `${room}${VOWEL_END.has(last) || RIEUL_END.has(last) ? '로' : '으로'}`;
};

// The room to book: the one the request was sent with while it is free, else the kind's first free room, which the line
// says ("G412가 그 사이 차서 G415로 바꿨어요"). Null when none is free.
export function roomOnReady(
  sent: string | null,
  free: readonly LibraryRoomTimes[],
): { room: string | null; switched: string | null } {
  if (sent !== null && free.some(({ NAME }) => NAME === sent)) {
    return { room: sent, switched: null };
  }
  const first = free[0]?.NAME ?? null;
  return {
    room: first,
    switched: sent !== null && first !== null ? `${subjectOf(sent)} 그 사이 차서 ${towardOf(first)} 바꿨어요` : null,
  };
}

// With none of the kind free for the whole time: when one is free next that day, for the card to ask again at that
// time, and the words; null when the kind has a free room.
export function noRoomOf(
  group: StudyGroup,
  all: readonly LibraryRoomTimes[],
  slot: Slot,
): { words: string; again: string | null } {
  const [again = null] = nearestStarts(all, group.room.space.seatNos, { ...slot, earliest: slot.start });
  const next = again === null ? '' : ` ${again}부터는 ${group.room.name}이 비어 있어요.`;
  return { words: `그 시간에는 빈 방이 없어요.${next}`, again };
}

// The button's words to ask again at the next free time: "16:00–18:00으로 다시 묻기".
export function againWords(again: string, minutes: number): string {
  return `${rangeWords(again, minutes)}으로 다시 묻기`;
}

// The request's line once everyone has consented.
export function readyLineOf(loggedIn: boolean, switched: string | null): string {
  if (!loggedIn) {
    return '모두 동의했어요 · 관정 로그인이 풀렸어요';
  }
  return switched ?? '모두 동의했어요';
}

// Past the booking window (a key ending in ":wait"): when the room can be booked, as the card says it.
export function waitWords(group: StudyGroup, slot: Slot, now: Date): string | null {
  if (group.key?.endsWith(':wait') !== true || group.opens === null) {
    return null;
  }
  return `${dayWords(slot.date, now)} 방은 ${group.opens}부터 예약할 수 있어요.`;
}

export function isWaiting(group: StudyGroup): boolean {
  return group.key?.endsWith(':wait') === true;
}
