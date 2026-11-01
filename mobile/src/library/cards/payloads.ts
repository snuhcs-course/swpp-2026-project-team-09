/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { RoomBooking, SeatBooking } from '../client';
import type { LibraryRoomForm, LibraryRoomTimes, LibrarySeat } from '../replies';
import { siteBookTime, siteDate } from './times';

// What a book card sends on 예약하기, in the shape the library client turns into the site's form (`bookingBody`).

export interface Slot {
  // "YYYY-MM-DD", "HH:MM" and minutes.
  date: string;
  start: string;
  minutes: number;
}

export function seatBookingOf(space: LibrarySpace, slot: Slot, seat: LibrarySeat): SeatBooking {
  return {
    kind: 'seat',
    roomNo: space.roomNo,
    sectorNo: space.sectorNo,
    useTime: slot.minutes,
    bookDate: siteDate(slot.date),
    bookTime: siteBookTime(slot.start, slot.minutes),
    seatNo: seat.SEATNO,
  };
}

// The first of the room form's comma lists: the applicant's own name and 학번.
function first(list: string): string {
  return list.split(',')[0]?.trim() ?? '';
}

// A room for the applicant alone, with the phone number and email the site prefilled. Companions are ticket 09's.
export function roomBookingOf(
  space: LibrarySpace,
  slot: Slot,
  room: LibraryRoomTimes,
  useDesc: string,
  form: LibraryRoomForm,
): RoomBooking {
  return {
    kind: 'room',
    roomNo: Number(room.ROOMNO) || space.roomNo,
    sectorNo: Number(room.SECTORNO) || space.sectorNo,
    seatNo: Number(room.SEATNO),
    bookDate: siteDate(slot.date),
    bookTime: siteBookTime(slot.start, slot.minutes),
    useDesc,
    phoneNum: form.phoneNum,
    eMail: form.eMail,
    members: [{ name: first(form.tmpUserNames), schoolNo: first(form.tmpSchoolNos) }],
  };
}
