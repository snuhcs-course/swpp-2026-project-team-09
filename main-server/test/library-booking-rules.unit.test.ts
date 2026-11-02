/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  type BookingRequest,
  checkBooking,
  earliestStartMinutes,
  PARTY_REFUSAL,
  type Refusal,
} from '../src/assistant/library/booking-rules.js';
import { CATALOGUE_FILE, type Catalogue, readCatalogue } from '../src/assistant/library/catalogue.js';

// Wednesday 2026-11-04, 10:05 in Korea: the P6 world's clock.
const NOW = new Date('2026-11-04T10:05:00+09:00');

let catalogue: Catalogue;

beforeAll(async () => {
  catalogue = await readCatalogue(CATALOGUE_FILE);
});

function check(spaceId: string, request: Partial<BookingRequest>): ReturnType<typeof checkBooking> {
  const space = catalogue.byId.get(spaceId);
  if (space === undefined) {
    throw new Error(`No ${spaceId}`);
  }
  return checkBooking(catalogue, space, { date: '2026-11-04', people: 1, ...request }, NOW);
}

function refusalsOf(spaceId: string, request: Partial<BookingRequest>): Refusal[] {
  const checked = check(spaceId, request);
  return 'refusals' in checked ? checked.refusals : [];
}

function reasonsOf(spaceId: string, request: Partial<BookingRequest>): string[] {
  return refusalsOf(spaceId, request).map(({ reason }) => reason);
}

const seat = '7F-7A-zone2';
const room = '4F-group-6';

describe('The booking window, the hours and the duration', () => {
  it.each<[string, string, Partial<BookingRequest>, string | null]>([
    ['a seat today', seat, { start: '17:00', minutes: 60 }, null],
    ['a seat tomorrow', seat, { date: '2026-11-05', start: '17:00', minutes: 60 }, '열람실은 당일만 예약할 수 있어요'],
    ['a room in 3 days', room, { date: '2026-11-07', start: '15:00', minutes: 60, people: 4 }, null],
    [
      'a room in 4 days',
      room,
      { date: '2026-11-08', start: '15:00', minutes: 60, people: 4 },
      '그룹스터디룸은 3일 뒤까지만 예약할 수 있어요',
    ],
    ['yesterday', seat, { date: '2026-11-03', start: '17:00', minutes: 60 }, '지난 날짜는 예약할 수 없어요'],
    [
      'a start already past',
      seat,
      { start: '10:00', minutes: 60 },
      '이미 지난 시간이에요. 오늘은 10:30부터 예약할 수 있어요',
    ],
    ['the next 30-minute mark', seat, { start: '10:30', minutes: 60 }, null],
    ['a start off the step', seat, { start: '17:10', minutes: 60 }, '시작 시간은 30분 단위예요'],
    ['until 23:00', seat, { start: '22:00', end: '23:00' }, null],
    ['past 23:00', seat, { start: '23:00', minutes: 30 }, '열람실은 07:00–23:00에 이용할 수 있어요'],
    ['six hours', seat, { start: '11:00', minutes: 360 }, null],
    ['seven hours', seat, { start: '11:00', minutes: 420 }, '열람실은 최대 6시간이에요'],
    ['45 minutes', seat, { start: '11:00', minutes: 45 }, '30분 단위로 예약할 수 있어요'],
    ['a room for 3 hours', room, { start: '11:00', minutes: 180, people: 4 }, null],
    ['a room for 3 hours 30', room, { start: '11:00', minutes: 210, people: 4 }, '그룹스터디룸은 최대 3시간이에요'],
    [
      'a room before 09:00',
      room,
      { start: '08:00', minutes: 60, people: 4, date: '2026-11-05' },
      '그룹스터디룸은 09:00–23:00에 이용할 수 있어요',
    ],
    ['an end before the start', seat, { start: '17:00', end: '16:00' }, '끝나는 시간이 시작 시간보다 늦어야 해요'],
  ])('%s', (_, spaceId, request, reason) => {
    expect(reasonsOf(spaceId, request)).toEqual(reason === null ? [] : [reason]);
  });
});

describe('The checks beside the table', () => {
  it('refuses the studio on a Sunday', () => {
    const studio = catalogue.byId.get('6F-studio');
    const saturday = new Date('2026-11-07T10:05:00+09:00');
    const request = { date: '2026-11-08', start: '10:00', minutes: 60, people: 1 };

    expect(studio === undefined ? null : checkBooking(catalogue, studio, request, saturday)).toEqual({
      refusals: [{ field: 'date', reason: '창의미디어스페이스 (STUDIO A/B/C)은 일요일에 열지 않아요' }],
    });
  });

  it('lists every missing and wrong field at once', () => {
    expect(refusalsOf(seat, { date: '2026-11-05', seat: '9999', people: 2 }).map(({ field }) => field)).toEqual([
      'date',
      'start',
      'minutes',
      'seat',
      'friendIds',
    ]);
  });

  it('rounds now up to the next 30-minute mark', () => {
    expect(earliestStartMinutes(new Date('2026-11-04T10:00:00+09:00'), 30)).toBe(600);
    expect(earliestStartMinutes(new Date('2026-11-04T10:00:01+09:00'), 30)).toBe(630);
    expect(earliestStartMinutes(NOW, 30)).toBe(630);
  });
});

describe('People', () => {
  it.each<[string, string, number, string | null]>([
    ['a seat alone', seat, 1, null],
    ['a seat with a Friend', seat, 2, '열람실 좌석은 한 사람씩 예약해요. 함께 가는 분은 각자 예약해 주세요'],
    ['6인실 for 3', room, 3, '그룹스터디룸 6인실 (24 rooms)은 4명 이상이어야 예약할 수 있어요. 1명 더 필요해요'],
    ['6인실 for 4', room, 4, null],
    ['10인실 for 7', '2F-group-10', 7, null],
    ['10인실 for 8, since "10" > "8" as numbers', '2F-group-10', 8, null],
    ['10인실 for 9', '2F-group-10', 9, PARTY_REFUSAL],
    ['G201 for 1', '2F-group-20', 1, PARTY_REFUSAL],
    ['G201 for 8', '2F-group-20', 8, PARTY_REFUSAL],
    ['G201 for 12', '2F-group-20', 12, PARTY_REFUSAL],
    ['XR for 2', '6F-xr', 2, 'XR Experience Center은 최대 1명까지예요'],
  ])('%s', (_, spaceId, people, reason) => {
    const request = { date: spaceId === seat ? '2026-11-04' : '2026-11-05', start: '15:00', minutes: 60, people };

    expect(reasonsOf(spaceId, request)).toEqual(reason === null ? [] : [reason]);
  });

  it('names the larger sizes on that floor a party can hold, never G201', () => {
    const [refusal] = refusalsOf('2F-group-6', { date: '2026-11-05', start: '15:00', minutes: 60, people: 7 });

    expect(refusal).toMatchObject({
      field: 'friendIds',
      reason: '그룹스터디룸 6인실은 최대 6명까지예요. 7명이면 그룹스터디룸 10인실을 예약할 수 있어요',
      bound: { max: 6, larger: [{ id: '2F-group-10' }] },
    });
  });
});

describe('The seat, the equipment and the 사용용도', () => {
  it('takes a seat of the sector and a 사용용도 of the space', () => {
    const checked = check(room, {
      date: '2026-11-05',
      start: '15:00',
      minutes: 60,
      people: 4,
      seat: 'g405',
      useDesc: '과제',
    });

    expect(checked).toEqual({
      booking: { date: '2026-11-05', start: '15:00', minutes: 60, seat: 'G405', equipment: null, useDesc: '과제' },
    });
  });

  it('refuses a 사용용도 the space does not offer, and an equipment group it does not have', () => {
    expect(
      refusalsOf('6F-media-carrel', {
        date: '2026-11-05',
        start: '10:00',
        minutes: 60,
        useDesc: '콘텐츠제작',
        equipment: 'with-monitor',
      }),
    ).toMatchObject([
      { field: 'equipment' },
      { field: 'useDesc', bound: ['강의', '과제', '동아리활동', '연구', '취업', '기타'] },
    ]);
  });

  it('takes an equipment group, and drops a 사용용도 given for a seat', () => {
    const checked = check(room, {
      date: '2026-11-05',
      start: '15:00',
      minutes: 60,
      people: 4,
      equipment: 'with-monitor',
    });
    const seatChecked = check(seat, { start: '17:00', minutes: 60, useDesc: '과제' });

    expect(checked).toMatchObject({ booking: { equipment: { id: 'with-monitor' }, useDesc: null } });
    expect(seatChecked).toMatchObject({ booking: { useDesc: null } });
  });
});
