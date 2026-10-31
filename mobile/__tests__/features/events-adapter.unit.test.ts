/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions: each filter of the 행사 tab at the edges of today and of the week, the search's fields, the sheet's own and
// others' rows, and the AI 매칭 list's ages. Expected values: P13-03's criteria, worked by hand in Korea's time.

import type { MatchingRequest } from '@/api/matching-types';
import type { RecruitingQuest } from '@/api/party-types';
import type { GlobalEvent, Person, Quest } from '@/api/types';
import {
  type EventFilter,
  type EventSources,
  eventTime,
  isOverPeriod,
  sharedQuestFor,
  toEventViews,
  toMatchingRows,
  toRecruitRows,
} from '@/features/events/adapter';

// 13:00 in Korea on Tuesday 6 October 2026; the week ends on Sunday the 11th.
const NOW = new Date('2026-10-06T13:00:00+09:00');
const ME: Person = { id: 'me', name: '홍길동', department: '컴퓨터공학부' };
const MIN_JUN: Person = { id: 'min-jun', name: '김민준', department: '경영학과' };

function event(id: string, startsAt: string, more: Partial<GlobalEvent> = {}): GlobalEvent {
  return {
    id,
    title: `${id} 설명회`,
    description: '',
    startsAt,
    endsAt: null,
    place: null,
    latitude: 37.45,
    longitude: 126.95,
    sourceUrl: null,
    ...more,
  };
}

function questFor(eventId: string, holders: Person[], leader: Person = ME): Quest {
  return {
    id: `quest-${eventId}`,
    title: `${eventId} 같이 가요`,
    globalEvent: { id: eventId, title: `${eventId} 설명회` },
    leader,
    capacity: 4,
    joinPolicy: 'closed',
    holders,
    subQuests: [
      {
        id: 's1',
        attending: true,
        title: eventId,
        startsAt: '2026-10-06T18:00:00+09:00',
        endsAt: null,
        place: { placeId: null, label: '301동 대강당', latitude: 37.45, longitude: 126.95 },
        completion: 'by_hand',
        cancelled: false,
        done: false,
        ended: false,
      },
    ],
    classQuest: false,
    waitingJoinRequests: 0,
    board: null,
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
  };
}

function recruiting(eventId: string | null, id = `r-${eventId ?? 'none'}`): RecruitingQuest {
  return {
    id,
    title: '같이 가요',
    globalEvent: eventId === null ? null : { id: eventId, title: eventId },
    leader: MIN_JUN,
    holderCount: 2,
    capacity: 4,
    joinPolicy: 'open',
    board: 'show',
    description: '',
    createdAt: '2026-10-05T09:00:00.000Z',
    nextSubQuest: { id: 'n1', title: '모이기', startsAt: '2026-10-07T17:40:00+09:00', endsAt: null, place: null },
  };
}

function request(globalEventId: string, state: MatchingRequest['state'], arrivedAt: string): MatchingRequest {
  return { globalEventId, size: 3, state, arrivedAt, questId: null };
}

function sources(events: GlobalEvent[], more: Partial<EventSources> = {}): EventSources {
  return { events, announcers: [], recruiting: [], quests: [], matching: [], now: NOW, ...more };
}

function idsOf(filter: EventFilter, events: GlobalEvent[], more: Partial<EventSources> = {}, search = ''): string[] {
  return toEventViews(sources(events, more), filter, search).map(({ id }) => id);
}

describe('eventTime', () => {
  it.each([
    [
      'an end today',
      { startsAt: '2026-10-06T18:00:00+09:00', endsAt: '2026-10-06T20:00:00+09:00' },
      '오늘 18:00–20:00',
    ],
    ['no end tomorrow', { startsAt: '2026-10-07T17:40:00+09:00', endsAt: null }, '내일 17:40'],
    ['a later day', { startsAt: '2026-10-08T09:00:00+09:00', endsAt: null }, '10월 8일 (목) 09:00'],
  ])('%s → "%s"', (_, times, expected) => {
    expect(eventTime(times, NOW)).toBe(expected);
  });
});

describe('isOverPeriod', () => {
  it.each([
    ['no end', '2026-10-06T18:00:00+09:00', null, false],
    ['a sitting of an evening', '2026-10-06T18:00:00+09:00', '2026-10-06T20:00:00+09:00', false],
    ['a night across midnight', '2026-10-06T22:00:00+09:00', '2026-10-07T02:00:00+09:00', false],
    ['exactly a day', '2026-10-06T14:00:00+09:00', '2026-10-07T14:00:00+09:00', false],
    ['a minute over a day', '2026-10-06T14:00:00+09:00', '2026-10-07T14:01:00+09:00', true],
    ['two whole days', '2026-10-06T00:00:00+09:00', '2026-10-07T23:59:00+09:00', true],
    ['an exhibition', '2026-10-05T00:00:00+09:00', '2026-11-30T23:59:00+09:00', true],
  ])('%s', (_, startsAt, endsAt, expected) => {
    expect(isOverPeriod({ startsAt, endsAt })).toBe(expected);
  });
});

describe('eventTime of an event over a period', () => {
  it.each([
    ['its last day, without its hours', '2026-10-05T00:00:00+09:00', '2026-11-30T23:59:00+09:00', '11월 30일까지'],
    ['a time the post writes', '2026-10-05T10:00:00+09:00', '2026-11-30T18:00:00+09:00', '11월 30일까지'],
    ['today as its last day, by date', '2026-10-01T00:00:00+09:00', '2026-10-06T23:59:00+09:00', '10월 6일까지'],
    // 23:59 in Korea is 14:59 UTC, and 01:00 in Korea the day before by UTC.
    ['the day in Korea', '2026-10-01T00:00:00+09:00', '2026-10-31T01:00:00+09:00', '10월 31일까지'],
    ['the next year', '2026-12-20T00:00:00+09:00', '2027-01-05T23:59:00+09:00', '1월 5일까지'],
  ])('reads %s', (_, startsAt, endsAt, expected) => {
    expect(eventTime({ startsAt, endsAt }, NOW)).toBe(expected);
  });

  it('leaves a night across midnight its day and hours', () => {
    expect(eventTime({ startsAt: '2026-10-06T22:00:00+09:00', endsAt: '2026-10-07T02:00:00+09:00' }, NOW)).toBe(
      '오늘 22:00–02:00',
    );
  });
});

describe('toEventViews filters', () => {
  const started = event('started', '2026-10-06T09:00:00+09:00');
  const lastOfToday = event('last-of-today', '2026-10-06T23:59:00+09:00');
  const tomorrow = event('tomorrow', '2026-10-07T00:00:00+09:00');
  const sunday = event('sunday', '2026-10-11T23:59:00+09:00');
  const monday = event('monday', '2026-10-12T00:00:00+09:00');
  const all = [started, lastOfToday, tomorrow, sunday, monday];

  it('전체 → every Event, in their order', () => {
    expect(idsOf('all', all)).toEqual(['started', 'last-of-today', 'tomorrow', 'sunday', 'monday']);
  });

  it('오늘 → the Events that start by midnight in Korea, one already started too', () => {
    expect(idsOf('today', all)).toEqual(['started', 'last-of-today']);
  });

  it('이번 주 → the Events that start by Sunday midnight in Korea', () => {
    expect(idsOf('week', all)).toEqual(['started', 'last-of-today', 'tomorrow', 'sunday']);
  });

  it('이번 주 on a Sunday → that Sunday only', () => {
    const onSunday = { now: new Date('2026-10-11T10:00:00+09:00') };
    expect(idsOf('week', [sunday, monday], onSunday)).toEqual(['sunday']);
  });

  it('파티 모집 중 → the Events with a recruiting Quest', () => {
    const more = { recruiting: [recruiting('sunday'), recruiting(null)] };
    expect(idsOf('recruiting', all, more)).toEqual(['sunday']);
  });
});

describe('toEventViews search', () => {
  const events = [
    event('a', '2026-10-07T10:00:00+09:00', { title: 'AI 커리어 설명회' }),
    event('b', '2026-10-07T10:00:00+09:00', { title: '축제', place: '301동 대강당' }),
    event('c', '2026-10-07T10:00:00+09:00', { title: '공연', description: 'Jazz night' }),
  ];

  it.each([
    ['a title in another case', ' ai ', ['a']],
    ['a place', '301동', ['b']],
    ['a description', 'jazz', ['c']],
    ['nothing typed', '  ', ['a', 'b', 'c']],
    ['words no Event holds', '수학', []],
  ])('%s → its Events', (_, search, expected) => {
    expect(idsOf('all', events, {}, search)).toEqual(expected);
  });
});

describe('toEventViews card', () => {
  const night = event('night', '2026-10-06T18:00:00+09:00', { endsAt: '2026-10-06T20:00:00+09:00', place: '대강당' });

  it('an announcer, two recruiting Quests, a Quest held and a request waiting → all on the card', () => {
    const [view] = toEventViews(
      sources([night], {
        announcers: [{ eventId: 'night', announcer: '컴퓨터공학부' }],
        recruiting: [recruiting('night', 'r1'), recruiting('night', 'r2')],
        quests: [questFor('night', [ME])],
        matching: [request('night', 'waiting', '2026-10-06T12:58:00+09:00')],
      }),
      'all',
      '',
    );
    expect(view).toMatchObject({ source: '컴퓨터공학부', time: '오늘 18:00–20:00', place: '대강당', recruiting: 2 });
    expect(view).toMatchObject({ mine: true, matching: true });
  });

  it('no announcer, no Quest and a request matched already → none of them', () => {
    const more = { matching: [request('night', 'matched', '2026-10-06T12:00:00+09:00')] };
    const [view] = toEventViews(sources([night], more), 'all', '');
    expect(view).toMatchObject({ source: null, recruiting: 0, mine: false, matching: false });
  });
});

describe('toRecruitRows', () => {
  it("the User's own Quest → first, 내 파티, with when and where", () => {
    const rows = toRecruitRows('night', [questFor('night', [ME, MIN_JUN])], [recruiting('night')], ME.id, NOW);
    expect(rows.map(({ questId, held }) => [questId, held])).toEqual([
      ['quest-night', true],
      ['r-night', false],
    ]);
    expect(rows[0]).toMatchObject({
      badge: { kind: 'mine', label: '내 파티' },
      fill: '2/4명',
      meta: '18:00 · 301동 대강당',
    });
  });

  it("another's Quest the User holds → 참여 중, its Leader's name first", () => {
    const [row] = toRecruitRows('night', [questFor('night', [MIN_JUN, ME], MIN_JUN)], [], ME.id, NOW);
    expect(row).toMatchObject({ badge: { kind: 'in', label: '참여 중' }, meta: '김민준 · 18:00 · 301동 대강당' });
  });

  it("a recruiting Quest → its Leader's badge, its fill and its next Sub Quest's day", () => {
    const [row] = toRecruitRows('night', [], [recruiting('night')], ME.id, NOW);
    expect(row).toMatchObject({ badge: { kind: 'leader', label: '김민준' }, fill: '2/4명', meta: '내일 17:40' });
  });

  it('a Quest for another Event → no row', () => {
    expect(toRecruitRows('night', [questFor('other', [ME])], [], ME.id, NOW)).toEqual([]);
  });
});

describe('sharedQuestFor', () => {
  it('a Quest for the Event held with another → that Quest', () => {
    const shared = questFor('night', [ME, MIN_JUN]);
    expect(sharedQuestFor([questFor('other', [ME, MIN_JUN]), shared], 'night')).toBe(shared);
  });

  it('a Quest for the Event held alone → null', () => {
    expect(sharedQuestFor([questFor('night', [ME])], 'night')).toBeNull();
  });
});

describe('toMatchingRows', () => {
  const night = event('night', '2026-10-06T18:00:00+09:00', { endsAt: '2026-10-06T20:00:00+09:00', place: '대강당' });

  it.each([
    ['under a minute ago', '2026-10-06T12:59:01+09:00', '방금 신청'],
    ['a minute ago', '2026-10-06T12:59:00+09:00', '1분 전'],
    ['59 minutes ago', '2026-10-06T12:01:00+09:00', '59분 전'],
  ])('a request waiting since %s → "%s"', (_, arrivedAt, ago) => {
    const [row] = toMatchingRows([request('night', 'waiting', arrivedAt)], [night], NOW);
    expect(row).toEqual({ eventId: 'night', title: 'night 설명회', when: '오늘 18:00–20:00 · 대강당', size: 3, ago });
  });

  it('requests matched, withdrawn or expired → no row', () => {
    const states = ['matched', 'withdrawn', 'expired'] as const;
    const requests = states.map((state) => request('night', state, '2026-10-06T12:00:00+09:00'));
    expect(toMatchingRows(requests, [night], NOW)).toEqual([]);
  });

  it('a request for an Event no longer listed → no title and no time', () => {
    const [row] = toMatchingRows([request('gone', 'waiting', '2026-10-06T12:00:00+09:00')], [night], NOW);
    expect(row).toMatchObject({ title: '', when: '' });
  });
});
