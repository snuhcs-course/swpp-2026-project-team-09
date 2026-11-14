/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { pickStudyTime, type StudyFacts, type StudyPerson } from '../src/assistant/library/study-pick.js';

const KWANJEONG = 'kwanjeong';
const THURSDAY = '2026-11-19';
const FRIDAY = '2026-11-20';
const SATURDAY = '2026-11-21';

// Walking minutes to 관정관, the same back.
const WALKS: Record<string, number> = { '24': 4, doosan: 4, '301': 14, '302': 16, near: 10 };
const walkingMinutes = (from: string, to: string): number => WALKS[from === KWANJEONG ? to : from] ?? 0;

const item = (date: string, start: string, end: string, placeId: string | null, isClass = true): DayItem => ({
  id: `${start}-${end}`,
  name: 'item',
  start: new Date(`${date}T${start}:00+09:00`),
  end: new Date(`${date}T${end}:00+09:00`),
  placeId,
  isClass,
});

const stay = (personId: string, from: string, until: string, minutes: number): object => ({
  personId,
  from,
  until,
  minutes,
});

const person = (id: string, itemsByDate: Record<string, DayItem[]> = {}): StudyPerson => ({ id, itemsByDate });

const facts = (people: StudyPerson[], dates: string[], open: string, close: string, more = {}): StudyFacts => ({
  people,
  dates,
  hours: { open, close },
  stepMinutes: 30,
  kwanjeongPlaceId: KWANJEONG,
  walkingMinutes,
  ...more,
});

// The design's table lists only the items around the slot; the day adds 민수's morning Classes and 지은's evening so
// that the table's slot is the pick.
const thursday: StudyPerson[] = [
  person('me', { [THURSDAY]: [item(THURSDAY, '14:00', '15:15', '301')] }),
  person('seojun', { [THURSDAY]: [item(THURSDAY, '13:00', '13:50', '24'), item(THURSDAY, '14:00', '14:50', '24')] }),
  person('jieun', {
    [THURSDAY]: [
      item(THURSDAY, '14:00', '15:15', 'doosan'),
      item(THURSDAY, '17:00', '18:15', 'doosan'),
      item(THURSDAY, '18:30', '22:00', 'doosan', false),
    ],
  }),
  person('minsu', {
    [THURSDAY]: [
      item(THURSDAY, '09:30', '10:45', '302'),
      item(THURSDAY, '11:00', '12:15', '302'),
      item(THURSDAY, '12:30', '13:45', '302'),
      item(THURSDAY, '15:30', '16:45', '302'),
    ],
  }),
];

describe("The design's Thursday", () => {
  it('picks the design example: nobody left out, the shortest stay as long as possible', () => {
    expect(pickStudyTime(facts(thursday, [THURSDAY], '09:00', '23:00'))).toEqual([
      {
        date: THURSDAY,
        booking: {
          date: THURSDAY,
          start: '15:30',
          end: '18:30',
          stays: [
            { personId: 'me', from: '15:30', until: '18:30', minutes: 180 },
            { personId: 'seojun', from: '15:30', until: '18:30', minutes: 180 },
            { personId: 'jieun', from: '15:30', until: '16:56', minutes: 86 },
            { personId: 'minsu', from: '17:01', until: '18:30', minutes: 89 },
          ],
          shortestMinutes: 86,
          totalMinutes: 535,
          threeOrMoreMinutes: 175,
        },
      },
    ]);
  });

  it('leaves 민수 out at 11:30, who can stay only 14:01–14:30', () => {
    expect(pickStudyTime(facts(thursday, [THURSDAY], '11:30', '14:30'))).toEqual([{ date: THURSDAY, booking: null }]);
  });

  it('does not offer 13:30, where the booker stays only from 15:29', () => {
    expect(pickStudyTime(facts(thursday, [THURSDAY], '13:30', '16:30'))).toEqual([{ date: THURSDAY, booking: null }]);
  });
});

describe('Days free all morning', () => {
  it('picks the earliest full-length start on a day free all morning', () => {
    const people = [person('me'), person('a'), person('b')];

    expect(pickStudyTime(facts(people, [FRIDAY], '09:00', '23:00'))).toEqual([
      {
        date: FRIDAY,
        booking: {
          date: FRIDAY,
          start: '09:00',
          end: '12:00',
          stays: [
            stay('me', '09:00', '12:00', 180),
            stay('a', '09:00', '12:00', 180),
            stay('b', '09:00', '12:00', 180),
          ],
          shortestMinutes: 180,
          totalMinutes: 540,
          threeOrMoreMinutes: 180,
        },
      },
    ]);
  });
});

describe('A booking that leaves somebody out', () => {
  it('has no booking on a date where somebody can stay only 29 minutes, and one where they can stay 30', () => {
    const friend = person('friend', {
      [FRIDAY]: [item(FRIDAY, '09:29', '12:00', null)],
      [SATURDAY]: [item(SATURDAY, '09:30', '12:00', null)],
    });

    expect(pickStudyTime(facts([person('me'), friend], [FRIDAY, SATURDAY], '09:00', '12:00'))).toEqual([
      {
        date: SATURDAY,
        booking: {
          date: SATURDAY,
          start: '09:00',
          end: '12:00',
          stays: [stay('me', '09:00', '12:00', 180), stay('friend', '09:00', '09:30', 30)],
          shortestMinutes: 30,
          totalMinutes: 210,
          threeOrMoreMinutes: 0,
        },
      },
      { date: FRIDAY, booking: null },
    ]);
  });
});

describe('A booker who comes late', () => {
  it('offers a booking the booker reaches 60 minutes after its start, not 61', () => {
    const me = person('me', {
      [FRIDAY]: [item(FRIDAY, '08:00', '10:01', null)],
      [SATURDAY]: [item(SATURDAY, '08:00', '10:00', null)],
    });

    expect(pickStudyTime(facts([me, person('friend')], [FRIDAY, SATURDAY], '09:00', '12:00'))).toEqual([
      {
        date: SATURDAY,
        booking: {
          date: SATURDAY,
          start: '09:00',
          end: '12:00',
          stays: [stay('me', '10:00', '12:00', 120), stay('friend', '09:00', '12:00', 180)],
          shortestMinutes: 120,
          totalMinutes: 300,
          threeOrMoreMinutes: 0,
        },
      },
      { date: FRIDAY, booking: null },
    ]);
  });
});

describe('A tie on the shortest stay', () => {
  it('decides a tie on the shortest stay by the larger total', () => {
    // d stays 10:30–11:30 in every booking; c gives 150, 180, and 150 minutes from 09:00, 09:30, and 10:00.
    const c = person('c', { [FRIDAY]: [item(FRIDAY, '08:00', '09:30', null), item(FRIDAY, '12:30', '13:00', null)] });
    const d = person('d', { [FRIDAY]: [item(FRIDAY, '08:00', '10:30', null), item(FRIDAY, '11:30', '13:00', null)] });

    expect(pickStudyTime(facts([person('me'), c, d], [FRIDAY], '09:00', '13:00'))).toEqual([
      {
        date: FRIDAY,
        booking: {
          date: FRIDAY,
          start: '09:30',
          end: '12:30',
          stays: [stay('me', '09:30', '12:30', 180), stay('c', '09:30', '12:30', 180), stay('d', '10:30', '11:30', 60)],
          shortestMinutes: 60,
          totalMinutes: 420,
          threeOrMoreMinutes: 60,
        },
      },
    ]);
  });

  it('puts the earlier date first when two dates tie on the shortest stay and the total', () => {
    const picks = pickStudyTime(facts([person('me'), person('friend')], [SATURDAY, FRIDAY], '09:00', '12:00'));

    expect(picks.map(({ date, booking }) => [date, booking?.start, booking?.totalMinutes])).toEqual([
      [FRIDAY, '09:00', 360],
      [SATURDAY, '09:00', 360],
    ]);
  });
});

describe("Today's earliest start", () => {
  it('starts today no earlier than allowed, and later days from the opening', () => {
    const today = '2026-11-15';
    const tomorrow = '2026-11-16';
    const early = person('early', {
      [today]: [item(today, '12:30', '13:00', null)],
      [tomorrow]: [item(tomorrow, '12:30', '13:00', null)],
    });
    const earliest = new Date(`${today}T09:40:00+09:00`);

    expect(pickStudyTime(facts([person('me'), early], [today, tomorrow], '09:00', '13:00', { earliest }))).toEqual([
      {
        date: tomorrow,
        booking: {
          date: tomorrow,
          start: '09:00',
          end: '12:00',
          stays: [stay('me', '09:00', '12:00', 180), stay('early', '09:00', '12:00', 180)],
          shortestMinutes: 180,
          totalMinutes: 360,
          threeOrMoreMinutes: 0,
        },
      },
      {
        date: today,
        booking: {
          date: today,
          start: '10:00',
          end: '13:00',
          stays: [stay('me', '10:00', '13:00', 180), stay('early', '10:00', '12:30', 150)],
          shortestMinutes: 150,
          totalMinutes: 330,
          threeOrMoreMinutes: 0,
        },
      },
    ]);
  });
});

describe("The room's hours and the walks", () => {
  it('ends no booking after the close', () => {
    // A booking from 10:00 would give both 180 minutes, but it would end at 13:00.
    const late = person('late', { [FRIDAY]: [item(FRIDAY, '08:00', '10:00', null)] });

    expect(pickStudyTime(facts([person('me'), late], [FRIDAY], '09:00', '12:30'))).toEqual([
      {
        date: FRIDAY,
        booking: {
          date: FRIDAY,
          start: '09:30',
          end: '12:30',
          stays: [stay('me', '09:30', '12:30', 180), stay('late', '10:00', '12:30', 150)],
          shortestMinutes: 150,
          totalMinutes: 330,
          threeOrMoreMinutes: 0,
        },
      },
    ]);
  });

  it('counts no walk after an item without a Place', () => {
    const me = person('me', { [FRIDAY]: [item(FRIDAY, '08:00', '09:10', null)] });
    const friend = person('friend', { [FRIDAY]: [item(FRIDAY, '08:00', '09:10', 'near')] });

    expect(pickStudyTime(facts([me, friend], [FRIDAY], '09:00', '12:00'))[0]?.booking?.stays).toEqual([
      stay('me', '09:10', '12:00', 170),
      stay('friend', '09:20', '12:00', 160),
    ]);
  });
});

describe('An item in the middle of a booking', () => {
  it('takes the longest stretch around an item in the booking, the earlier on a tie', () => {
    const f1 = person('f1', { [FRIDAY]: [item(FRIDAY, '10:00', '10:30', 'near')] });
    const f2 = person('f2', { [FRIDAY]: [item(FRIDAY, '10:00', '11:00', null)] });

    expect(pickStudyTime(facts([person('me'), f1, f2], [FRIDAY], '09:00', '12:00'))).toEqual([
      {
        date: FRIDAY,
        booking: {
          date: FRIDAY,
          start: '09:00',
          end: '12:00',
          stays: [
            stay('me', '09:00', '12:00', 180),
            stay('f1', '10:40', '12:00', 80),
            stay('f2', '09:00', '10:00', 60),
          ],
          shortestMinutes: 60,
          totalMinutes: 320,
          threeOrMoreMinutes: 0,
        },
      },
    ]);
  });
});
