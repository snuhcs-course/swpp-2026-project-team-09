/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { onDay } from '../src/assistant/free-time/free-time.js';
import { type StudyArea } from '../src/assistant/lookup/study-near.js';
import { readyAt } from '../src/assistant/lookup/study-plan.js';
import { ENGINEERING_AREA, MOUNTAIN_AREA } from './study-area-example.js';
import { asked, readStudySeed } from './study-plan-example.js';
import { classAt, ME, numbered, TUESDAY } from './way-example.js';
import { withoutBand } from './no-plan.js';

// "공부할 자리 있어?" ranked over the seed's buildings and hours (P10 ticket 03), on Tuesday 2026-11-17, a term
// weekday, by the seed's calendar. The User is at 301동 unless given otherwise.

beforeAll(readStudySeed);

const known = ({ study }: AnswerReply['plans'][number]): boolean => study?.spaces[0]?.open === 'open';
const ids = ({ plans }: AnswerReply): string[] => plans.map(({ id: planId }) => planId);
const closedOf = ({ closed = [] }: AnswerReply): [string, string[]][] =>
  closed.map(({ place, notices }) => [place.label, notices]);

// Around 16동, 사회과학도서관 alone.
function socialSciencesArea(): StudyArea {
  const { latitude, longitude } = numbered('16');
  return { south: latitude - 0.0003, west: longitude - 0.0003, north: latitude + 0.0003, east: longitude + 0.0003 };
}

describe('Study places at 10:00 on a term weekday', () => {
  it('lists the buildings known open first, then those whose hours are not known, each by the shorter walk when every stay is long enough', () => {
    const { plans } = asked({ clock: '10:00' });
    const firstUnknown = plans.findIndex((plan) => !known(plan));

    expect(firstUnknown).toBeGreaterThan(0);
    expect(plans.slice(firstUnknown).every((plan) => !known(plan))).toBe(true);
    expect(plans.every(({ togetherMinutes }) => togetherMinutes >= 180)).toBe(true);
    for (const group of [plans.slice(0, firstUnknown), plans.slice(firstUnknown)]) {
      const walks = group.map(({ parts }) => parts[0]?.walkMinutes ?? 0);
      expect(walks).toEqual(walks.toSorted((a, b) => a - b));
    }
    expect(plans.slice(firstUnknown).flatMap(({ lines }) => lines.at(-1))).toEqual(
      plans.slice(firstUnknown).map(() => ({ text: '여는 시간을 몰라요', strong: false })),
    );
  });

  it('drops 제2공학관 for a 경제학부 User, with whom it is open to, and plans it for a 화학생물공학부 User', () => {
    const economics = asked({ clock: '10:00' });
    const chemical = asked({ clock: '10:00', department: '화학생물공학부' });

    expect(economics.dropped.map(({ reason }) => reason)).toContain('화학생물공학부 학생만 쓸 수 있어요');
    expect(ids(economics)).not.toContain('제2공학관');
    expect(ids(chemical)).toContain('제2공학관');
  });

  it('numbers every building on each plan’s map, the plan’s own the pick', () => {
    const { plans } = asked({ clock: '10:00' });
    const second = plans[1]?.scene.places.filter(({ role }) => role === 'pick' || role === 'candidate');

    expect(second?.map(({ order }) => order)).toEqual(plans.map((_, index) => index + 1));
    expect(second?.find(({ role }) => role === 'pick')?.order).toBe(2);
  });

  it('lists a building closed then apart, with when it opens', () => {
    const early = asked({ clock: '07:30' });

    expect(closedOf(early)).toContainEqual(['사회과학도서관(16동)', ['09:00에 열어요']]);
    expect(ids(early)).not.toContain('사회과학도서관');
  });
});

describe('Study places at 23:30', () => {
  it('puts the 24-hour spaces first, before the stays cut short by a closing, and 관정 among the closed', () => {
    const late = asked({ clock: '23:30' });

    expect(ids(late).slice(0, 4)).toEqual(['공대 신양학술정보관', '중앙도서관', '법학도서관', '제1법학관']);
    expect(late.plans.slice(2, 4).map(({ togetherMinutes }) => togetherMinutes)).toEqual([71, 69]);
    expect(late.plans[0]?.lines[0]?.[1]).toEqual({ text: ' · 24시간', strong: false });
    expect(closedOf(late)).toContainEqual(['관정관(62-1동)', ['오늘 23:00에 닫았어요']]);
  });

  it('with nothing open or unknown, says so and which opens first', () => {
    const { plans, noPlan } = asked({ clock: '07:30', area: socialSciencesArea() });

    expect(plans).toEqual([]);
    expect(withoutBand(noPlan)).toEqual({
      reason: 'no-fit',
      lines: [
        [{ text: '지금 연 공부할 곳이 없어요', strong: false }],
        [
          { text: '사회과학도서관(16동)', strong: true },
          { text: ' 09:00에 열어요', strong: false },
        ],
      ],
    });
  });
});

describe('Study places in the area the User sees', () => {
  it('holds only the buildings in it', () => {
    expect(ids(asked({ clock: '10:00', department: '컴퓨터공학부', area: ENGINEERING_AREA })).toSorted()).toEqual([
      '제1공학관',
      '제2공학관',
    ]);
  });

  it('says none is there, or that every one there is open only to others', () => {
    expect(asked({ clock: '10:00', area: MOUNTAIN_AREA }).noPlan?.lines[0]).toEqual([
      { text: '보는 범위에 공부할 곳이 없어요', strong: false },
    ]);
    expect(asked({ clock: '10:00', area: ENGINEERING_AREA }).noPlan?.lines[0]).toEqual([
      { text: '쓸 수 있는 공부할 곳이 없어요', strong: false },
    ]);
  });
});

// An answer without a plan keeps its time card (P05 ticket 67), as a meal's does (ticket 65): the User's lane from when
// they are ready to the end they set, else their next item, else three hours on. Its range is a time card's without a
// place's hours (P01 ticket 43): from now to the day's last half hour.
const at = (clock: string): string => `${TUESDAY}T${clock}:00+09:00`;

describe('A study answer without a plan', () => {
  it('with nothing open, keeps the time card over the three hours from now, its range on to 23:30', () => {
    const { noPlan } = asked({ clock: '07:30', area: socialSciencesArea() });

    expect(noPlan?.band).toEqual({
      range: { startAt: at('07:30'), endAt: at('23:30') },
      now: at('07:30'),
      lanes: [{ userId: ME, name: '나', busy: [] }],
      startAt: at('07:30'),
      endAt: at('10:30'),
      text: '07:30–10:30',
    });
  });

  it('with no time before the next Class, ends at it and reaches over it', () => {
    const items = [classAt(TUESDAY, '12:00', '13:00', '제1공학관')];
    const { plans, noPlan } = asked({ clock: '11:56', items });

    expect(plans).toEqual([]);
    expect(noPlan?.band).toMatchObject({
      range: { startAt: at('11:30'), endAt: at('23:30') },
      lanes: [{ userId: ME, name: '나', busy: [{ startAt: at('12:00'), endAt: at('13:00') }] }],
      startAt: at('11:56'),
      endAt: at('12:00'),
    });
  });
});

describe('A study plan before the next Class', () => {
  it('ends the stay by the walk on to it, and says so', () => {
    const items = [classAt(TUESDAY, '11:00', '11:50', '제1공학관'), classAt(TUESDAY, '13:00', '13:50', '자연과학관6')];
    const { plans } = asked({ clock: '12:10', items });
    const sinyang = plans.find(({ id: planId }) => planId === '공대 신양학술정보관');

    expect(sinyang).toMatchObject({ startAt: '2026-11-17T12:18:00+09:00', endAt: '2026-11-17T12:52:00+09:00' });
    expect(sinyang?.lines[1]).toEqual([{ text: '13:00 수업 전 34분', strong: false }]);
    expect(sinyang?.parts[0]).toMatchObject({ walkMinutes: 8, leaveBy: '2026-11-17T12:52:00+09:00' });
  });

  it('has its stay as its one step, as a meal’s Plan has, for the Quest it is saved as (P10 ticket 24)', () => {
    const { plans } = asked({ clock: '12:10' });
    const [first] = plans;

    expect(first?.subQuests).toEqual([
      { at: first?.startAt, placeId: first?.place.placeId, title: `${first?.id ?? ''}에서 공부` },
    ]);
  });

  it('says the stay’s length on its time card, as the group room’s card does', () => {
    const items = [classAt(TUESDAY, '11:00', '11:50', '제1공학관'), classAt(TUESDAY, '15:00', '15:50', '자연과학관6')];
    const { plans } = asked({ clock: '12:10', items });
    const sinyang = plans.find(({ id: planId }) => planId === '공대 신양학술정보관');

    expect(sinyang?.band.text).toBe('12:18–14:52 · 2시간 34분');
  });
});

// A time card's range (P01 ticket 43): from now to the space's closing, at most 16 hours, so that the start can be
// moved far in one drag. The user's own case: at 01:10, a 24-hour room drew 01:00–05:00.
const rangeOf = (clock: string, planId: string): { startAt: string; endAt: string } | undefined =>
  asked({ clock }).plans.find(({ id: plan }) => plan === planId)?.band.range;

describe("A study plan's time card", () => {
  it('at a 24-hour room at night, runs 16 hours from now', () => {
    expect(rangeOf('01:10', '공대 신양학술정보관')).toEqual({ startAt: at('01:00'), endAt: at('17:00') });
  });

  it('at 관정관 by day, runs from now to its closing', () => {
    expect(rangeOf('10:10', '관정관')).toEqual({ startAt: at('10:00'), endAt: at('23:00') });
  });
});

describe('관정관’s plan', () => {
  it('books the first 7층 seat for a quiet place or any, and no other plan books', () => {
    for (const what of ['quiet', 'any'] as const) {
      const { plans } = asked({ clock: '10:00', what });
      const booked = plans.flatMap(({ id: planId, study }) =>
        study?.book === null || study?.book === undefined ? [] : [[planId, study.book.spaceId]],
      );

      expect(booked).toEqual([['관정관', '7F-7A-zone2']]);
      expect(plans.find(({ id: planId }) => planId === '관정관')?.study?.liveSeats).toBe('kwanjeong');
    }
  });

  it('is no plan for computers or a group room, whose 관정 bookings take another path', () => {
    for (const what of ['pc', 'group'] as const) {
      expect(ids(asked({ clock: '10:00', what }))).not.toContain('관정관');
    }
  });
});

describe('When the User is ready', () => {
  const now = onDay(TUESDAY, '10:00');

  it('is the time asked from, another day’s 09:00, or now', () => {
    const window = { from: null, until: null };

    expect(readyAt({ date: TUESDAY, window: { from: '15:00', until: null } }, now)).toEqual(onDay(TUESDAY, '15:00'));
    expect(readyAt({ date: '2026-11-18', window }, now)).toEqual(onDay('2026-11-18', '09:00'));
    expect(readyAt({ date: TUESDAY, window }, now)).toEqual(now);
  });
});

// 관정관's plan carries the book card the app opens in it (P10 ticket 21), as proposeLibraryBooking shows it for the
// plan's day, start and length on the space's steps. The fixture's copy, mobile/__tests__/fixtures/
// study-kwanjeong-book.json, is what the app checks its card reading against.
const kwanjeongOf = (answer: AnswerReply): AnswerReply['plans'][number] | undefined =>
  answer.plans.find(({ id: planId }) => planId === '관정관');

describe("관정관's plan's book card", () => {
  it('is the fixture of the app: "공부할 자리 있어?" on Wednesday 2026-11-04 at 19:10 at 301동', () => {
    const fixture: unknown = JSON.parse(
      readFileSync(new URL('fixtures/study/kwanjeong-book.json', import.meta.url), 'utf8'),
    );

    expect(kwanjeongOf(asked({ clock: '19:10', date: '2026-11-04' }))?.study).toEqual(fixture);
  });

  it('moves with the time asked', () => {
    const book = kwanjeongOf(asked({ clock: '20:40', date: '2026-11-04' }))?.study?.book;

    expect(book?.card).toMatchObject({ action: 'book', date: '2026-11-04' });
    expect(book?.card.start).not.toBe(
      kwanjeongOf(asked({ clock: '19:10', date: '2026-11-04' }))?.study?.book?.card.start,
    );
    expect(book?.card.key).toBe(
      `book:7F-7A-zone2:2026-11-04:${(book?.card.start ?? '').replace(':', '')}:${String(book?.card.minutes)}`,
    );
  });
});
