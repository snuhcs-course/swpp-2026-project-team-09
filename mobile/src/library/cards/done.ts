/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibraryCardData, LibrarySpace } from '@/api/assistant-types';
import { seatWords } from './bookings';
import { seatsCardOf } from './made';
import type { Slot } from './payloads';
import { whenWords } from './times';

// The done message of a booking (the MainChatLibReserved frame): the app's own bubble, which is never sent to the
// Assistant. The 예약 번호 (BSEQNO) is shown on the phone only.

export const KIOSK_SENTENCE =
  '예약한 뒤 30분 안에 좌석배정기(키오스크)에서 확인해 주세요. 확인하지 않으면 자동으로 반납돼요.';
export const RETURN_SENTENCE =
  '사용 다했으면 꼭 반납처리를 해주세요! 저한테 말해주셔도 되고 키오스크를 이용해 반납하셔도 돼요!';

export interface LibraryDone {
  title: string;
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
