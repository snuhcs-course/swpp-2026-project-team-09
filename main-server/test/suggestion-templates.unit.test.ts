/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type FriendToday,
  lunchWithFreeFriend,
  partyForOpenEvent,
  routeToNextClass,
  type TodaysClass,
} from '../src/assistant/suggestions/templates.js';
import { gongangStarted, isFree, nextClass } from '../src/assistant/suggestions/timetable-status.js';
import { type PublishedGlobalEventDto } from '../src/global-events/dto/global-event.dto.js';

// The grey suggestions' templates (P07 ticket 04) on plain data: when each applies and what it would do.

function korea(at: string): Date {
  return new Date(`${at}:00+09:00`);
}

function minutes(time: string): number {
  const [hours = 0, rest = 0] = time.split(':').map(Number);
  return hours * 60 + rest;
}

const LIBRARY = { id: 'place-library', name: '중앙도서관' };
const DATABASES: TodaysClass = { courseName: '데이터베이스', startTime: '09:30', endTime: '10:45', place: LIBRARY };
const MINSU: FriendToday = { id: 'friend-minsu', name: '민수', times: [{ startTime: '09:00', endTime: '11:30' }] };

describe('isFree, gongangStarted and nextClass', () => {
  it('reads a class as covering its start and not its end', () => {
    expect(isFree([DATABASES], minutes('09:30'))).toBe(false);
    expect(isFree([DATABASES], minutes('10:44'))).toBe(false);
    expect(isFree([DATABASES], minutes('10:45'))).toBe(true);
    expect(isFree([], minutes('10:00'))).toBe(true);
  });

  it('starts a 공강 when a class ended within 15 minutes or the first class is over an hour away', () => {
    expect(gongangStarted([DATABASES], minutes('11:00'))).toBe(true);
    expect(gongangStarted([DATABASES], minutes('11:01'))).toBe(false);
    expect(gongangStarted([DATABASES], minutes('08:29'))).toBe(true);
    expect(gongangStarted([DATABASES], minutes('08:30'))).toBe(false);
    expect(gongangStarted([], minutes('08:00'))).toBe(false);
  });

  it('finds the class that starts next, after now', () => {
    const later = { ...DATABASES, courseName: '컴파일러', startTime: '13:00', endTime: '14:15' };

    expect(nextClass([later, DATABASES], minutes('09:00'))).toBe(DATABASES);
    expect(nextClass([later, DATABASES], minutes('09:30'))).toBe(later);
    expect(nextClass([later, DATABASES], minutes('13:00'))).toBeUndefined();
  });
});

describe('lunchWithFreeFriend', () => {
  it('suggests lunch with the free Friend at the next quarter hour at least 15 minutes ahead', () => {
    const candidate = lunchWithFreeFriend(korea('2101-03-07T11:52'), [DATABASES], [MINSU]);

    expect(candidate).toEqual({
      template: 'lunch_with_free_friend',
      text: '민수랑 점심 어때요?',
      reason: '점심시간 · 민수도 공강',
      repeats: 0,
      action: {
        type: 'proposal',
        input: {
          title: '민수랑 점심',
          joinPolicy: 'closed',
          capacity: 2,
          startsAt: '2101-03-07T12:15:00+09:00',
          inviteeIds: ['friend-minsu'],
        },
        found: [{ kind: 'friend', id: 'friend-minsu' }],
      },
    });
  });

  it('says a 공강 started, and picks the particle after the name', () => {
    const jihun = { ...MINSU, id: 'friend-jihun', name: '지훈' };
    const candidate = lunchWithFreeFriend(korea('2101-03-07T11:40'), [{ ...DATABASES, endTime: '11:30' }], [jihun]);

    expect(candidate).toMatchObject({ text: '지훈이랑 점심 어때요?', reason: '공강 시작 · 지훈도 공강' });
  });

  it('names the first free Friend in the order of the list', () => {
    const busy = { ...MINSU, id: 'friend-busy', name: '가람', times: [{ startTime: '11:00', endTime: '13:00' }] };
    const dana = { ...MINSU, id: 'friend-dana', name: '다나' };

    expect(lunchWithFreeFriend(korea('2101-03-07T12:00'), [], [MINSU, busy, dana])).toMatchObject({
      text: '다나랑 점심 어때요?',
    });
  });

  it.each([
    ['before 11:00', '10:59', [], [MINSU]],
    ['from 14:00', '14:00', [], [MINSU]],
    ['while the User is in class', '12:00', [{ ...DATABASES, startTime: '11:30', endTime: '12:30' }], [MINSU]],
    ['while the Friend is in class', '11:15', [], [MINSU]],
    ['when the Friend has no class today', '12:00', [], [{ ...MINSU, times: [] }]],
    ['without Friends', '12:00', [], []],
  ])('applies not %s', (_when, time, own, friends) => {
    expect(lunchWithFreeFriend(korea(`2101-03-07T${time}`), own, friends)).toBeNull();
  });
});

describe('routeToNextClass', () => {
  it('routes to the Place of the next class within an hour, on the main screen', () => {
    expect(routeToNextClass('main', korea('2101-03-07T08:30'), [DATABASES])).toEqual({
      template: 'route_to_next_class',
      text: '중앙도서관까지 길 안내할까요?',
      reason: '데이터베이스 09:30 시작',
      repeats: 0,
      action: { type: 'route', placeId: 'place-library', name: '중앙도서관' },
    });
  });

  it.each([
    ['on another screen', 'events', '09:00', [DATABASES]],
    ['when the next class is over an hour away', 'main', '08:29', [DATABASES]],
    ['when the next class has no Place', 'main', '09:00', [{ ...DATABASES, place: null }]],
    ['when no class is left today', 'main', '09:31', [DATABASES]],
  ] as const)('applies not %s', (_when, screen, time, classes) => {
    expect(routeToNextClass(screen, korea(`2101-03-07T${time}`), classes)).toBeNull();
  });
});

const EVENT: PublishedGlobalEventDto = {
  id: 'event-concert',
  title: '관악 음악회',
  description: '',
  startsAt: korea('2101-03-09T19:00').toISOString(),
  endsAt: korea('2101-03-09T21:00').toISOString(),
  place: null,
  latitude: null,
  longitude: null,
  sourceUrl: null,
};

describe('partyForOpenEvent', () => {
  it('proposes an open 파티 on the show Board that starts with the event', () => {
    expect(partyForOpenEvent(korea('2101-03-07T12:00'), EVENT)).toEqual({
      template: 'party_for_open_event',
      text: '관악 음악회 같이 갈 파티 만들까요?',
      reason: '열어 본 행사 · 3월 9일 19:00',
      repeats: 0,
      action: {
        type: 'proposal',
        input: {
          title: '관악 음악회 같이 가요',
          description: '관악 음악회 같이 갈 사람 모집해요',
          joinPolicy: 'open',
          board: 'show',
          capacity: 3,
          globalEventId: 'event-concert',
        },
        found: [{ kind: 'globalEvent', id: 'event-concert' }],
      },
    });
  });

  it('shortens a long title so that the 파티 title fits 50 characters', () => {
    const candidate = partyForOpenEvent(korea('2101-03-07T12:00'), { ...EVENT, title: '가'.repeat(60) });

    expect(candidate?.action).toMatchObject({ input: { title: `${'가'.repeat(43)}… 같이 가요` } });
  });
});

describe('partyForOpenEvent, not applying', () => {
  it.each([
    ['without an open card', undefined],
    ['once the event ended', { ...EVENT, endsAt: korea('2101-03-07T12:00').toISOString() }],
    [
      'once an event without an end started',
      { ...EVENT, startsAt: korea('2101-03-07T11:00').toISOString(), endsAt: null },
    ],
    ['for an event without a start', { ...EVENT, startsAt: null }],
  ])('applies not %s', (_when, event) => {
    expect(partyForOpenEvent(korea('2101-03-07T12:00'), event)).toBeNull();
  });
});
