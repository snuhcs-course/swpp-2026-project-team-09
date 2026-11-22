/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { seatWords } from './bookings';
import { seatsCardOf } from './made';
import type { Slot } from './payloads';
import { roomTitle } from './seat-rooms';
import { clockOf, kioskDeadline, minutesOf, whenWords } from './times';
import { koreaMinutes } from '@/korea-time';

// The done message of a booking (the MainChatLibReserved frame): the app's own bubble, which is never sent to the
// Assistant. The 예약 번호 (BSEQNO) is shown on the phone only.

export const KIOSK_SENTENCE =
  '예약한 뒤 30분 안에 좌석배정기(키오스크)에서 확인해 주세요. 확인하지 않으면 자동으로 반납돼요.';
// In the app's own voice (P01 ticket 03); the site's note says the same in the library's.
export const RETURN_SENTENCE = '다 쓰면 꼭 반납해 주세요. 키오스크에서 하거나, 여기서 "반납해 줘"라고 말하면 돼요.';

export interface LibraryDone {
  title: string;
  // A seat's one line with the room's one name: "관정 8층 정숙 열람실 8001번 · 오늘 14:00–17:00" (P01 ticket 03).
  line?: string;
  // A seat's kiosk sentence with its clock time, in place of KIOSK_SENTENCE.
  kiosk?: string;
  // A seat's kiosk deadline ("14:07"), which the walk's line counts back from (P01 ticket 06).
  deadline?: string;
  // The seat booked ("8001"), which the map's label keeps until 확인.
  seatLabel?: string;
  rows: { label: string; value: string }[];
  // A seat is confirmed at the kiosk.
  seat: boolean;
  // What 좌석 현황 보기 shows.
  seatsCard: LibraryCardData;
}

export function doneOf(
  space: LibrarySpace,
  booked: { slot: Slot; label: string; bseqno: string; notes: string[] },
  now: Date,
): LibraryDone {
  const { slot, label, bseqno, notes } = booked;
  const seat = space.unit === 'seat';
  if (seat) {
    return {
      title: '✓ 예약했어요',
      line: `${roomTitle(space)} ${seatWords(label)} · ${whenWords(slot.date, slot.start, slot.minutes, now)}`,
      kiosk: `${kioskDeadline(now)}까지 좌석배정기에서 확인해 주세요. 확인하지 않으면 자동으로 반납돼요.`,
      deadline: kioskDeadline(now),
      seatLabel: label,
      rows: [{ label: '예약 번호', value: bseqno }],
      seat,
      seatsCard: seatsCardOf(space, notes),
    };
  }
  return {
    title: `${seatWords(label)} 예약되었어요!`,
    rows: [
      { label: '장소', value: `관정관 (${space.placeNumber}동) ${String(space.floor)}층 ${space.name}` },
      { label: seat ? '좌석' : '방', value: seatWords(label) },
      { label: '시간', value: whenWords(slot.date, slot.start, slot.minutes, now) },
      { label: '예약 번호', value: bseqno },
    ],
    seat,
    seatsCard: seatsCardOf(space, notes),
  };
}

// Within this many minutes of having to leave, the User is told to leave now.
const LEAVE_NOW_MINUTES = 5;

// The kiosk deadline joined with the walk there (P01 ticket 06): when to leave to confirm the seat in time, to leave
// now, or that the walk no longer makes it. Null without the walk's minutes or the deadline: the kiosk sentence stands
// alone then.
export function kioskWalkWords(deadline: string | undefined, walk: number | null, now: Date): string | null {
  if (deadline === undefined || walk === null) {
    return null;
  }
  const leaveBy = minutesOf(deadline) - walk;
  const left = leaveBy - koreaMinutes(now);
  if (left < 0) {
    return `걸음 ${String(walk)}분이라 ${deadline}까지 좌석배정기에 닿기 어려워요. 그때까지 확인하지 않으면 자동으로 반납돼요.`;
  }
  if (left < LEAVE_NOW_MINUTES) {
    return `걸음 ${String(walk)}분 · 지금 출발하면 ${deadline} 전에 좌석배정기에서 확인할 수 있어요.`;
  }
  return `걸음 ${String(walk)}분 · ${clockOf(leaveBy)}까지 출발하면 ${deadline} 전에 좌석배정기에서 확인할 수 있어요.`;
}
