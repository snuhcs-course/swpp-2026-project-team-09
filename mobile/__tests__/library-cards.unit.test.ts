/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { GROUP_ROOM, READING_ROOM } from '@/api/mock/data/library';
import { bookingBody } from '@/library/client';
import { bookingWords, cancelPeriod, matchingBookings, myBookingsPeriod } from '@/library/cards/bookings';
import { tappedSlot } from '@/library/cards/made';
import { roomBookingOf, seatBookingOf } from '@/library/cards/payloads';
import { freeRooms, freeStretches, nearestStarts, roomCovers } from '@/library/cards/rooms';
import { chooseSeat, nextFreeSeat, seatBoxes, seatState } from '@/library/cards/seats';
import { dayWords, nextStart, siteBookTime } from '@/library/cards/times';
import type { LibraryBooking, LibraryRoomTimes, LibrarySeat } from '@/library/replies';

// The library cards' pure parts: the site's booking forms, the seat map's scaling, the choice of a seat and a room,
// and which bookings a cancel or a return card acts on.

function seat(label: string, given: Partial<LibrarySeat> = {}): LibrarySeat {
  return {
    SEATNO: 17202000 + Number(label.slice(-2)),
    NAME: `7A 열람실 2구역-${label}`,
    VNAME: label,
    SECTORNO: 17202,
    STATUS: 1,
    USECNT: 0,
    POSX: 538,
    POSY: 41,
    POSW: 33,
    POSH: 45,
    GR_MIN: 0,
    GR_MAX: 0,
    ...given,
  };
}

function room(name: string, seatNo: string, abletime: string[]): LibraryRoomTimes {
  return {
    SEATNO: seatNo,
    NAME: name,
    SECTORNO: '14103',
    ROOMNO: '141',
    ABLETIME: abletime.map((clock) => `2026-11-02 ${clock}:00`).join(','),
    OPENTIME: '0900',
    CLOSETIME: '2300',
  };
}

function booking(given: Partial<LibraryBooking>): LibraryBooking {
  return {
    BSEQNO: 1,
    SEATNO: 17202001,
    USESTART: '2026-11-02 17:00:00',
    USEEXPIRE: '2026-11-02 18:00:00',
    STATUS: 2,
    STATUS_NAME: '예약',
    FLOOR_NAME: '7층',
    ROOM_NAME: '7A 열람실',
    SECTOR_NAME: '7A 열람실 2 구역',
    SEAT_NAME: '7A 열람실 2구역-1',
    SEAT_VNAME: '7193',
    SECTORNO: 17202,
    ROOMNO: 172,
    ...given,
  };
}

// 16:40 on 2026-11-02 in Korea.
const NOW = new Date('2026-11-02T07:40:00.000Z');

describe('the booking forms', () => {
  it("builds a seat's form as the site's reading-room booking", () => {
    const made = seatBookingOf(READING_ROOM, { date: '2026-11-02', start: '17:00', minutes: 90 }, seat('7193'));

    expect(bookingBody(made)).toEqual({
      roomNo: '172',
      sectorNo: '17202',
      useTime: '90',
      bookDate: '20261102',
      bookTime: '1700-1830',
      seatNo: String(17202093),
      sMemberJsInfo: '',
    });
  });

  it("builds a room's form with the room form's phone and email, the applicant alone and first, the 학번 unhyphened", () => {
    const form = {
      tmpUserNames: '김새내',
      tmpSchoolNos: '2026-00001',
      phoneNum: '010-0000-0000',
      eMail: 'a@example.com',
    };
    const made = roomBookingOf(
      GROUP_ROOM,
      { date: '2026-11-03', start: '17:30', minutes: 120 },
      room('G411', '14103008', []),
      '과제',
      form,
    );

    expect(bookingBody(made)).toEqual({
      roomNo: '141',
      sectorNo: '14103',
      seatNo: '14103008',
      bookTime: '1730-1930',
      bookDate: '20261103',
      useDesc: '과제',
      phoneNum: '010-0000-0000',
      eMail: 'a@example.com',
      sMemberJsInfo: '김새내,202600001',
    });
    expect(bookingBody(made)).not.toHaveProperty('useTime');
  });
});

describe('the seat map', () => {
  it('scales each seat box, 33×28 at POSX, POSY, to the width the map is drawn at', () => {
    const [box] = seatBoxes([seat('7193', { POSX: 1000, POSY: 500 })], 2000, 300);

    expect(box).toMatchObject({ left: 150, top: 75, width: 4.95, height: 4.2, state: 'free' });
  });

  it('tells free, taken and accessible seats apart', () => {
    expect(seatState({ STATUS: 1, USECNT: 0 })).toBe('free');
    expect(seatState({ STATUS: 1, USECNT: 1 })).toBe('taken');
    expect(seatState({ STATUS: 2, USECNT: 0 })).toBe('taken');
    expect(seatState({ STATUS: 9, USECNT: 0 })).toBe('accessible');
  });
});

describe('the choice of a seat', () => {
  const seats = [seat('7210'), seat('7195', { USECNT: 1 }), seat('7201'), seat('7198', { STATUS: 9 })];

  it('takes the named seat while it is free, else the first free seat in label order', () => {
    expect(chooseSeat(seats, '7210')?.VNAME).toBe('7210');
    expect(chooseSeat(seats, '7195')?.VNAME).toBe('7201');
    expect(chooseSeat(seats, null)?.VNAME).toBe('7201');
    expect(chooseSeat([seat('7195', { USECNT: 1 })], null)).toBeNull();
  });

  it('offers the next free seat after one just taken', () => {
    expect(nextFreeSeat(seats, '7201')?.VNAME).toBe('7210');
    expect(nextFreeSeat(seats, '7210')?.VNAME).toBe('7201');
  });
});

describe('the choice of a room', () => {
  const rooms = [
    room('G404', '14103001', ['17:00', '18:00']),
    room('G405', '14103002', ['17:00', '17:30', '18:00']),
    room('G406', '14103003', ['10:00', '10:30', '19:00', '19:30']),
  ];
  const slot = { date: '2026-11-02', start: '17:00', minutes: 60 };

  it('keeps the rooms whose ABLETIME covers every 30 minutes of the slot', () => {
    expect(roomCovers(rooms[0], '2026-11-02', '17:00', 60)).toBe(false);
    expect(freeRooms(rooms, [], slot).map(({ NAME }) => NAME)).toEqual(['G405']);
    expect(freeRooms(rooms, [14103001, 14103003], slot)).toEqual([]);
  });

  it('gives the nearest free starts that day when none is free, none before the earliest', () => {
    expect(nearestStarts(rooms, [14103001, 14103003], { ...slot, earliest: '17:00' })).toEqual(['19:00']);
    expect(nearestStarts(rooms, [], { ...slot, start: '18:00', earliest: '09:00' })).toEqual([
      '10:00',
      '17:00',
      '17:30',
      '19:00',
    ]);
  });

  it("writes a room's free stretches", () => {
    expect(freeStretches(rooms[2], '2026-11-02')).toEqual(['10:00–11:00', '19:00–20:00']);
  });
});

describe('the bookings a card acts on', () => {
  const bookings = [
    booking({ BSEQNO: 1, STATUS: 2 }),
    booking({ BSEQNO: 2, STATUS: 3, USESTART: '2026-11-02 15:00:00' }),
    booking({ BSEQNO: 3, STATUS: 1, USESTART: '2026-11-03 10:00:00', SECTORNO: 14103 }),
    booking({ BSEQNO: 4, STATUS: 7 }),
  ];

  it('cancels a booking awaiting approval or booked, and returns one checked in', () => {
    const cancels = matchingBookings(bookings, { action: 'cancel', target: {}, space: null });
    const returns = matchingBookings(bookings, { action: 'return', target: {}, space: null });

    expect(cancels.map(({ BSEQNO }) => BSEQNO)).toEqual([1, 3]);
    expect(returns.map(({ BSEQNO }) => BSEQNO)).toEqual([2]);
  });

  it('keeps those of the target date, start and space', () => {
    expect(
      matchingBookings(bookings, { action: 'cancel', target: { date: '2026-11-03' }, space: null }).map(
        ({ BSEQNO }) => BSEQNO,
      ),
    ).toEqual([3]);
    expect(
      matchingBookings(bookings, { action: 'cancel', target: { start: '17:00' }, space: null }).map(
        ({ BSEQNO }) => BSEQNO,
      ),
    ).toEqual([1]);
    expect(
      matchingBookings(bookings, { action: 'cancel', target: { spaceId: GROUP_ROOM.id }, space: GROUP_ROOM }).map(
        ({ BSEQNO }) => BSEQNO,
      ),
    ).toEqual([3]);
  });
});

describe('the periods and words of bookings', () => {
  it('reads yesterday to three days on for a cancel, and a week back to three days on for 내 예약', () => {
    expect(cancelPeriod('2026-11-02')).toEqual({ start: '20261101', end: '20261105' });
    expect(myBookingsPeriod('2026-11-02')).toEqual({ start: '20261026', end: '20261105' });
    expect(myBookingsPeriod('2026-11-02', { date: '2026-10-01', until: '2026-10-03' })).toEqual({
      start: '20261001',
      end: '20261003',
    });
  });

  it('words a booking as its row shows it', () => {
    expect(bookingWords(booking({ USESTART: '2026-11-03 10:00:00', USEEXPIRE: '2026-11-03 11:30:00' }), NOW)).toBe(
      '7층 7A 열람실 · 7193번 · 내일 10:00–11:30',
    );
    expect(bookingWords(booking({ SEAT_VNAME: 'G411', ROOM_NAME: '그룹스터디룸', FLOOR_NAME: '4층' }), NOW)).toBe(
      '4층 그룹스터디룸 · G411 · 오늘 17:00–18:00',
    );
  });
});

describe('the times', () => {
  it('starts a tapped seat at the next 30 minutes for 2 hours, within the hours', () => {
    expect(nextStart(NOW)).toBe('17:00');
    expect(tappedSlot(READING_ROOM, NOW, { start: null, minutes: null })).toEqual({
      date: '2026-11-02',
      start: '17:00',
      minutes: 120,
    });
    expect(tappedSlot(READING_ROOM, NOW, { start: '22:00', minutes: null })).toEqual({
      date: '2026-11-02',
      start: '22:00',
      minutes: 60,
    });
  });

  it("writes the site's time and the card's day", () => {
    expect(siteBookTime('23:30', 30)).toBe('2330-2400');
    expect(dayWords('2026-11-02', NOW)).toBe('오늘');
    expect(dayWords('2026-11-03', NOW)).toBe('내일');
    expect(dayWords('2026-11-05', NOW)).toBe('11월 5일 (목)');
  });
});
