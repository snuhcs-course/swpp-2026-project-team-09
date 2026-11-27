/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { koreaMinutes } from '@/korea-time';
import { type Deadline, seatWords, type TicketView } from './bookings';
import { seatsCardOf } from './made';
import type { Slot } from './payloads';
import { roomLabel } from './seat-rooms';
import { clockOf, dayWords, kioskDeadline, minutesOf, rangeWords, whenWords } from './times';

// The done message of a booking (the MainChatLibReserved frame): the app's own bubble, which is never sent to the
// Assistant. A seat's is its ticket, booked, with the time to confirm it at the 좌석배정기 (P01 ticket 15); a room's
// keeps its rows.

// In the app's own voice (P01 ticket 03); the site's note says the same in the library's.
export const RETURN_SENTENCE = '다 쓰면 꼭 반납해 주세요. 키오스크에서 하거나, 여기서 "반납해 줘"라고 말하면 돼요.';

export interface LibraryDone {
  title: string;
  // The booking's number, which a cancel from the done message sends; never shown.
  bseqno: string;
  // The seat card's place in the chat, whose outcome that cancel sets: the map's mark goes with it.
  place?: string;
  // A seat's ticket, its confirm time, and the start the library set when it is not the one sent (P01 ticket 15).
  ticket?: TicketView;
  deadline?: Deadline;
  moved?: string;
  // The seat booked ("8001"), which the map's label keeps.
  seatLabel?: string;
  // A room's rows.
  rows: { label: string; value: string }[];
  // A seat is confirmed at the kiosk.
  seat: boolean;
  // What a room's 좌석 현황 보기 shows.
  seatsCard: LibraryCardData;
}

interface Booked {
  slot: Slot;
  label: string;
  bseqno: string;
  notes: string[];
  // The start the library holds for the booking, read back after it (USESTART); null when it could not be read.
  start?: string | null;
}

export function doneOf(space: LibrarySpace, booked: Booked, now: Date): LibraryDone {
  const { slot, label, bseqno, notes } = booked;
  const seat = space.unit === 'seat';
  if (seat) {
    const start = booked.start ?? slot.start;
    return {
      title: '✓ 예약했어요',
      bseqno,
      ticket: {
        state: 'booked',
        word: '예약됨',
        when: `${dayWords(slot.date, now)} ${rangeWords(slot.start, slot.minutes)}`,
        room: roomLabel(space),
        unit: '좌석',
        seat: seatWords(label),
      },
      deadline: { date: slot.date, clock: kioskDeadline(start) },
      ...(start === slot.start ? {} : { moved: start }),
      seatLabel: label,
      rows: [],
      seat,
      seatsCard: seatsCardOf(space, notes),
    };
  }
  return {
    title: `${seatWords(label)} 예약되었어요!`,
    bseqno,
    rows: [
      { label: '장소', value: `관정관 (${space.placeNumber}동) ${String(space.floor)}층 ${space.name}` },
      { label: '방', value: seatWords(label) },
      { label: '시간', value: whenWords(slot.date, slot.start, slot.minutes, now) },
      { label: '예약 번호', value: bseqno },
    ],
    seat,
    seatsCard: seatsCardOf(space, notes),
  };
}

// Within this many minutes of having to leave, the User is told to leave now.
const LEAVE_NOW_MINUTES = 5;

// The booked ticket's one line (P01 tickets 06 and 15): the time to confirm the seat at the 좌석배정기, with when to
// leave for it when the walk there is known; a booking on another day says its day, and no walk.
export function confirmWords({ date, clock }: Deadline, walk: number | null, now: Date): string {
  const day = dayWords(date, now);
  if (day !== '오늘') {
    return `${day} ${clock}까지 좌석배정기에서 확인해요`;
  }
  if (walk === null) {
    return `${clock}까지 좌석배정기에서 확인해요`;
  }
  const leaveBy = minutesOf(clock) - walk;
  const left = leaveBy - koreaMinutes(now);
  if (left < 0) {
    return `${clock}까지 좌석배정기에 닿기 어려워요`;
  }
  return `${left < LEAVE_NOW_MINUTES ? '지금' : clockOf(leaveBy)} 출발 · ${clock}까지 좌석배정기 확인`;
}
