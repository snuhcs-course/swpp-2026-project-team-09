/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { clockOf, type DayItem, onDay } from '../src/assistant/free-time/free-time.js';
import { fitNewQuest, type NewQuestDay, type NewQuestPlanning } from '../src/assistant/recruiting/new-quest-fit.js';
import { type DayQuest, meetingPlaceOf } from '../src/assistant/recruiting/quest-fit.js';
import { type TravelProvider } from '../src/travel/travel.js';
import { DATE, id, myDay, NOW, readExample, travel } from './events-example.js';

// The time and the Place of a new recruiting Quest: the design's examples (section 6.3 Together 8 and 9, section 6.4
// Recruit 4) on the seed's walking table with the design's shuttle, and the boundaries on a small table of three Places.

beforeAll(() => readExample());

// When everyone is there and until when, as "start–end (minutes)" in clock times in Korea.
const summary = ({ start, end, minutes }: NewQuestPlanning): string => `${clockOf(start)}–${clockOf(end)} (${minutes})`;

const classOn = (date: string, [start, end]: [string, string], placeId: string | null, isClass = true): DayItem => ({
  id: `${placeId} ${start}`,
  name: 'Class',
  start: onDay(date, start),
  end: onDay(date, end),
  placeId,
  isClass,
});

// Row 4: Friday 13:50, the job fair in 문화관 from 10:00 to 17:00; 지은's Class in 38동 ends at 13:50.
const jieun = (): DayItem[] => [classOn(DATE, ['13:00', '13:50'], id('38동'))];

function jobFair(withJieun: boolean): NewQuestPlanning {
  const me = { userId: 'me', items: myDay(), locationPlaceId: null };
  const her = { userId: 'jieun', items: jieun(), locationPlaceId: null };
  return fitNewQuest(
    {
      date: DATE,
      now: NOW,
      placeId: id('문화관'),
      event: { start: onDay(DATE, '10:00'), end: onDay(DATE, '17:00') },
      time: null,
      people: withJieun ? [me, her] : [me],
      others: withJieun ? [] : [{ userId: 'jieun', items: jieun() }],
    },
    travel,
  );
}

describe('Row 4: a new party for the job fair', () => {
  it('alone meets at 14:00, the asker’s 13:54 rounded up, until 15:12, and offers 지은, free then', () => {
    const planning = jobFair(false);

    expect(summary(planning)).toBe('14:00–15:12 (72)');
    expect(planning.decidedBy).toEqual({ userId: 'me', arriveAt: onDay(DATE, '13:54') });
    expect(planning.ways).toMatchObject([
      {
        userId: 'me',
        there: { minutes: 4, mode: 'walk' },
        leaveAt: onDay(DATE, '13:56'),
        leaveBy: onDay(DATE, '15:12'),
      },
    ]);
    expect(planning.candidates.map(({ userId, stretch }) => [userId, stretch.previous?.placeId])).toEqual([
      ['jieun', id('38동')],
    ]);
    expect(planning.fits).toBe(true);
  });

  it('with 지은, who arrives at 14:01, meets at 14:10, until 15:12, each setting out in time', () => {
    const planning = jobFair(true);

    expect(summary(planning)).toBe('14:10–15:12 (62)');
    expect(planning.decidedBy).toEqual({ userId: 'jieun', arriveAt: onDay(DATE, '14:01') });
    expect(planning.ways).toMatchObject([
      { userId: 'me', leaveAt: onDay(DATE, '14:06') },
      { userId: 'jieun', origin: { placeId: id('38동') }, there: { minutes: 11 }, leaveAt: onDay(DATE, '13:59') },
    ]);
    expect(planning.candidates).toEqual([]);
  });
});

describe('Row 5: a new badminton party at the gymnasium, Thursday 16:45', () => {
  it('meets at 17:10, the asker’s 17:02 by shuttle rounded up, with 서준 setting out at 16:56', () => {
    const thursday = '2026-11-19';
    const planning = fitNewQuest(
      {
        date: thursday,
        now: onDay(thursday, '16:45'),
        placeId: id('체육관'),
        event: null,
        time: null,
        people: [
          { userId: 'me', items: [classOn(thursday, ['15:30', '16:45'], id('301동'))], locationPlaceId: null },
          { userId: 'seojun', items: [classOn(thursday, ['15:30', '16:45'], id('24동'))], locationPlaceId: null },
        ],
        others: [],
      },
      travel,
    );

    expect(summary(planning)).toBe('17:10–17:40 (30)');
    expect(planning.decidedBy).toEqual({ userId: 'me', arriveAt: onDay(thursday, '17:02') });
    expect(planning.ways).toMatchObject([
      { userId: 'me', there: { minutes: 17, mode: 'shuttle' }, leaveAt: onDay(thursday, '16:53'), leaveBy: null },
      { userId: 'seojun', there: { minutes: 14, mode: 'walk' }, leaveAt: onDay(thursday, '16:56') },
    ]);
  });
});

// Three Places: A to B is 10 minutes on foot, B to C 20, A to C 15.
const smallTravel: TravelProvider = (() => {
  const walks: Record<string, number> = { 'A B': 10, 'B C': 20, 'A C': 15 };
  const walk = (from: string, to: string): number =>
    from === to ? 0 : 60 * (walks[`${from} ${to}`] ?? walks[`${to} ${from}`] ?? Number.NaN);
  return { travel: (from, to) => ({ seconds: walk(from, to), mode: 'walk' }), walkingSeconds: walk };
})();

const time = (clock: string): Date => onDay(DATE, clock);

// A party at B, asked at 13:50 by an asker whose Class in A ends at `ends`, with these others of the Plan.
function fit({
  ends = '13:50',
  after = [],
  ...more
}: Partial<NewQuestDay> & { ends?: string; after?: DayItem[] } = {}): NewQuestPlanning {
  return fitNewQuest(
    {
      date: DATE,
      now: time('13:50'),
      placeId: 'B',
      event: null,
      time: null,
      people: [{ userId: 'me', items: [classOn(DATE, ['13:00', ends], 'A'), ...after], locationPlaceId: null }],
      others: [],
      ...more,
    },
    smallTravel,
  );
}

describe('The time', () => {
  it('stays on a ten-minute mark the last arrival falls on', () => {
    expect(summary(fit())).toBe('14:00–14:30 (30)');
  });

  it('a minute after a mark is the next mark', () => {
    expect(summary(fit({ ends: '13:51' }))).toBe('14:10–14:40 (30)');
  });

  it('follows a Friend who arrives later than the asker', () => {
    const planning = fit({
      people: [
        { userId: 'me', items: [classOn(DATE, ['13:00', '13:50'], 'A')], locationPlaceId: null },
        { userId: 'friend', items: [classOn(DATE, ['13:00', '13:50'], 'C')], locationPlaceId: null },
      ],
    });

    expect(summary(planning)).toBe('14:10–14:40 (30)');
    expect(planning.decidedBy).toEqual({ userId: 'friend', arriveAt: time('14:10') });
  });

  it('is the time said, as said, though everyone could be there earlier', () => {
    const planning = fit({ time: time('19:00') });

    expect(summary(planning)).toBe('19:00–19:30 (30)');
    expect(planning.decidedBy).toBeNull();
    expect(planning.ways[0]).toMatchObject({ leaveAt: time('18:50') });
  });

  it('is no earlier than the start of a Global Event that has not started', () => {
    const planning = fit({ event: { start: time('15:00'), end: time('16:00') } });

    expect(summary(planning)).toBe('15:00–16:00 (60)');
    expect(planning.decidedBy).toBeNull();
  });
});

describe('The end', () => {
  it('is when the first must leave for their next item, before the Global Event ends', () => {
    const planning = fit({
      event: { start: time('13:00'), end: time('17:00') },
      after: [classOn(DATE, ['15:00', '16:00'], 'C')],
    });

    expect(summary(planning)).toBe('14:00–14:40 (40)');
    expect(planning.ways[0]?.leaveBy).toEqual(time('14:40'));
  });
});

describe('The asker busy at the time said', () => {
  it('makes no plan', () => {
    expect(fit({ time: time('13:30') }).fits).toBe(false);
  });
});

describe('The Friends who could come', () => {
  it('are those free at the time, not those in a Class then', () => {
    const planning = fit({
      others: [
        { userId: 'free', items: [classOn(DATE, ['09:00', '10:00'], 'C')] },
        { userId: 'busy', items: [classOn(DATE, ['13:30', '15:00'], 'C')] },
      ],
    });

    expect(planning.candidates.map(({ userId }) => userId)).toEqual(['free']);
  });
});

// A recruiting party whose one step starts at that time at that Place.
const party = (start: string, placeId: string | null): DayQuest => ({
  id: `${placeId} ${start}`,
  title: '배드민턴',
  steps: [{ start: time(start), end: null, placeId, place: placeId, cancelled: false }],
  eventEnd: null,
  friendNames: [],
});

describe('The Place where the parties of a search meet', () => {
  it('is theirs when they all meet at one, whenever they start', () => {
    expect(meetingPlaceOf([party('17:00', 'B'), party('18:00', 'B')], time('16:45'))).toBe('B');
  });

  it('is none when one meets elsewhere, when none has a Place of the list, and with no party', () => {
    const now = time('16:45');

    expect(meetingPlaceOf([party('17:00', 'B'), party('18:00', 'C')], now)).toBeNull();
    expect(meetingPlaceOf([party('17:00', null)], now)).toBeNull();
    expect(meetingPlaceOf([], now)).toBeNull();
  });
});
