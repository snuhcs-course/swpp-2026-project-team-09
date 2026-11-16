/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, planInputSchema } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { type AnswerPerson } from '../src/assistant/gathering/meal-answer.js';
import { type Hours } from '../src/menus/restaurant-hours.js';
import { HAEUN, JIEUN, ME, me, MINSU, person, plain, strong, time } from './meal-answers.js';
import { answerFor, NOW_WINDOW as NOW, readUnmetWorld } from './unmet-answers.js';
import { classAt, DATE, id, restaurants } from './worked-example.js';

// Conditions that cannot be met (P02-14, boards n10, n11, n11b, n12, n23), on the worked example's Places and the
// seed's walking table, Tuesday 2026-11-17: a meal "now" that nobody can make, the conditions to ease, a plan moved
// past a Class too soon to eat before, a Restaurant that closes first, and a Friend whose position is unknown.

beforeAll(() => readUnmetWorld());

// Board n11's day: the asker in 301동 until 11:50 and in 24동 from 14:00, 민수 in 302동 until 12:15, and 지은 free
// from 11:50 until her Class in 두산인문관 from 12:00 to 12:50.
const asker = (): AnswerPerson =>
  person(ME, '유상', [classAt('11:00', '11:50', '제1공학관'), classAt('14:00', '14:50', '자연과학관6')]);
const minsu = (): AnswerPerson => person(MINSU, '민수', [classAt('11:00', '12:15', '제2공학관')]);
const jieun = (): AnswerPerson =>
  person(JIEUN, '지은', [classAt('11:00', '11:50', '두산인문관'), classAt('12:00', '12:50', '두산인문관')]);

const n11 = (window = NOW): AnswerReply => answerFor({ people: [asker(), minsu(), jieun()], clock: '11:50', window });

describe('Board n11: 민수, 지은이랑 지금 점심, with no time now that the three share', () => {
  it('has no pick, and says so, naming 지은 and when her Class starts again', () => {
    const { plans, noPlan } = n11();

    expect(plans).toEqual([]);
    expect(noPlan?.reason).toBe('no-shared-time');
    expect(noPlan?.lines).toEqual([
      [plain('지금은 셋이 먹을 때가 없어요')],
      [plain('지은이 '), strong('12:00'), plain('에 다시 수업이에요')],
    ]);
  });

  // 민수 left out, the asker and 지은 share ten minutes now: not enough.
  it('offers to leave out 지은 alone, then to eat when everyone is free next, rounded up to the half hour', () => {
    expect(n11().noPlan?.relax).toEqual([
      { kind: 'without', userId: JIEUN, label: '지은 빼고 보기' },
      { kind: 'from', time: '13:00', label: '13:00 이후' },
    ]);
  });

  it('shows 지금 as its time chip', () => {
    expect(n11().chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'from', text: '지금', userId: null },
      { kind: 'person', text: '민수', userId: MINSU },
      { kind: 'person', text: '지은', userId: JIEUN },
    ]);
  });
});

describe("Board n11's day otherwise", () => {
  it('takes the later shared time as before when the User did not say 지금', () => {
    const { plans, noPlan, chips } = n11({ from: null, until: null });

    expect(noPlan).toBeNull();
    expect(plans[0]).toMatchObject({ id: '학생회관식당', startAt: time('12:55') });
    expect(chips.map(({ text }) => text)).toEqual(['301동에서', '14:00 수업까지', '민수', '지은']);
  });

  it('plans now without 지은, with the time chips of a plan that is met', () => {
    const { plans, noPlan, chips } = answerFor({ people: [asker(), minsu()], clock: '11:50', window: NOW });

    expect(noPlan).toBeNull();
    expect(plans[0]?.startAt).toBe(time('12:15'));
    expect(chips.map(({ text }) => text)).toEqual(['301동에서', '14:00 수업까지', '민수']);
  });

  it('names nobody when the Friend to leave out is kept by something other than a Class', () => {
    const quest: DayItem = { ...classAt('12:00', '12:50', '두산인문관'), name: 'Quest', isClass: false };
    const busy = person(JIEUN, '지은', [classAt('11:00', '11:50', '두산인문관'), quest]);

    const { noPlan } = answerFor({ people: [asker(), minsu(), busy], clock: '11:50', window: NOW });

    expect(noPlan?.lines).toEqual([[plain('지금은 셋이 먹을 때가 없어요')]]);
  });

  it('says so of the asker alone, with only the later time to offer', () => {
    const soon = person(ME, '유상', [classAt('11:00', '11:50', '제1공학관'), classAt('12:00', '12:50', '제1공학관')]);

    const { noPlan } = answerFor({ people: [soon], clock: '11:50', window: NOW });

    expect(noPlan?.lines).toEqual([[plain('지금은 먹을 때가 없어요')], [strong('12:00'), plain('에 다시 수업이에요')]]);
    expect(noPlan?.relax).toEqual([{ kind: 'from', time: '13:00', label: '13:00 이후' }]);
  });
});

const n11b = (): AnswerReply => n11({ from: '13:00', until: null, now: true });

describe('Board n11b: 13:00 이후, the plan eased from 지금', () => {
  it('names the time, the Restaurant, and the minutes of the three, then what was eased', () => {
    expect(n11b().plans[0]?.lines).toEqual([
      [strong('13:00 학생회관식당'), plain(' · 셋이 59분')],
      [plain('지금 대신 13:00으로 미뤘어요')],
    ]);
  });

  it('marks its from chip relaxed in place of the time chip', () => {
    expect(n11b().chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'from', text: '13:00 이후', userId: null, mark: 'relaxed' },
      { kind: 'person', text: '민수', userId: MINSU },
      { kind: 'person', text: '지은', userId: JIEUN },
    ]);
  });

  it('says first in the basis whose Class keeps the three from eating sooner', () => {
    expect(n11b().plans[0]?.basis[0]).toBe('지은이 12:50까지 수업이라 13:00부터 셋이 돼요');
  });

  it('has no relax, being a plan', () => {
    expect(n11b().noPlan).toBeNull();
  });
});

// Board n10: on Tuesday at 15:20, the asker's Classes in 두산인문관 end at 15:15 and start again at 15:30.
const n10Day = (): AnswerPerson =>
  person(ME, '유상', [classAt('13:00', '15:15', '두산인문관'), classAt('15:30', '16:45', '두산인문관')]);
const DINNER_PLACES = (): GatheringPlace[] => [
  { key: '자하연식당', placeId: id('자하연식당') },
  { key: '학생회관식당', placeId: id('학생회관') },
];
const DINNER_HOURS: Hours[] = [
  { opensAt: '16:30', closesAt: '19:00' },
  { opensAt: '17:00', closesAt: '19:00' },
];

const n10 = (hours?: (Hours | null)[]): AnswerReply =>
  answerFor({ people: [n10Day()], clock: '15:20', meal: 'dinner', candidates: DINNER_PLACES(), hours });

describe('Board n10: 배고파 alone ten minutes before a Class', () => {
  it("moves the plan past the Class to the Restaurant's own opening, and says why", () => {
    const [first] = n10(DINNER_HOURS).plans;

    expect(first).toMatchObject({ id: '자하연식당', startAt: time('16:48') });
    expect(first?.lines).toEqual([
      [plain('수업까지 10분이라 식사는 어려워요')],
      [plain('수업 끝나고 '), strong('16:48'), plain(' 자하연식당')],
    ]);
  });

  it('marks the until chip of the Class relaxed', () => {
    expect(n10(DINNER_HOURS).chips).toEqual([
      { kind: 'origin', text: '8동에서', userId: null },
      { kind: 'until', text: '15:30 수업까지', userId: null, mark: 'relaxed' },
    ]);
  });

  it('says in the basis that a walk under 5 minutes gets no reminder to leave', () => {
    const [near, far] = n10(DINNER_HOURS).plans;

    expect(near?.basis).toEqual(['8동 → 자하연식당 걸어서 3분', '5분이 안 되는 길이라 나설 알림은 없어요']);
    expect(far?.basis).toEqual(['8동 → 학생회관식당 걸어서 5분']);
  });

  it("starts at the fixed meal window's opening when no hours were read", () => {
    const [first] = n10().plans;

    expect(first?.startAt).toBe(time('17:00'));
    expect(first?.lines[1]).toEqual([plain('수업 끝나고 '), strong('17:00'), plain(' 자하연식당')]);
  });
});

// Board n12: on Tuesday at 13:47, the asker's Class in 24동 ended at 13:45; 학생회관식당, a minute away, closes at 14:00.
const n12Day = (): AnswerPerson => person(ME, '유상', [classAt('12:30', '13:45', '자연과학관6')]);
const closing = (closesAt: string): (Hours | null)[] =>
  restaurants().map(({ key }) => (key === '학생회관식당' ? { opensAt: '11:00', closesAt } : null));

const n12 = (hours?: (Hours | null)[]): AnswerReply => answerFor({ people: [n12Day()], clock: '13:47', hours });

describe('Board n12: a Restaurant about to close', () => {
  it('drops the Restaurant that closes before the asker can eat there, saying when it closes', () => {
    const { dropped } = n12(closing('14:00'));

    expect(dropped.map(({ place, reason }) => [place.label, reason])).toEqual([['학생회관식당', '14:00 닫아요']]);
  });

  it('drops one the asker reaches only after it closes', () => {
    expect(n12(closing('13:45')).dropped.map(({ reason }) => reason)).toEqual(['13:45 닫아요']);
  });

  it('names the nearer Restaurant that closes in the lines of the pick', () => {
    const [pick, next] = n12(closing('14:00')).plans;

    expect(pick?.id).toBe('자하연식당');
    expect(pick?.lines).toEqual([
      [strong('자하연식당'), plain(' · 13:52 도착')],
      [plain('학생회관식당은 14:00에 닫아요')],
    ]);
    expect(next?.lines[0]).toEqual([plain('점심 '), strong('3식당'), plain(' · 식사 37분')]);
  });

  it('drops nothing and says nothing of closing when no hours were read', () => {
    const { plans, dropped } = n12();

    expect(dropped).toEqual([]);
    expect(plans[0]?.id).toBe('학생회관식당');
    expect(plans[0]?.lines[0]).toEqual([plain('점심 '), strong('학생회관식당'), plain(' · 식사 42분')]);
  });
});

// Board n23: 하은 shows the asker only her Timetable, and her Class ended at 10:45.
const haeunAt = (level: AnswerPerson['level']): AnswerPerson => ({
  ...person(HAEUN, '하은', [classAt('09:30', '10:45', '제2공학관')]),
  level,
});

const n23 = (level: AnswerPerson['level'] = 'timetable'): AnswerReply =>
  answerFor({ people: [me(), haeunAt(level)], clock: '11:50', window: NOW });

describe('Board n23: 하은이랑 지금 점심, where 하은 is unknown', () => {
  it('says the plan leaves out her way, and why', () => {
    expect(n23().plans[0]?.lines).toEqual([
      [strong('301동식당'), plain(' · 하은의 길은 빼고 정했어요')],
      [plain('하은은 지금 어디 있는지 몰라요')],
    ]);
  });

  it('says in the basis what the asker sees of her, and where her way is shown', () => {
    expect(n23().plans[0]?.basis.slice(0, 2)).toEqual([
      '하은은 시간표만 보여요. 10:45에 수업이 끝나 지금 자리는 몰라요',
      '하은의 길은 하은의 초대장에 떠요. 나에게는 수락과 거절만 와요',
    ]);
  });

  it('keeps the chips of a plan that is met now', () => {
    expect(n23().chips.map(({ text }) => text)).toEqual(['301동에서', '13:00 수업까지', '하은 · 자리 모름']);
  });

  it('does not say she shows only her Timetable when she shows more', () => {
    expect(n23('building').plans[0]?.basis[0]).toBe('하은은 지금 어디 있는지 몰라요');
  });
});

describe("A meal's window with 지금", () => {
  const meal = { kind: 'meal', date: DATE, meal: 'lunch', people: [{ userId: ME, constraints: [] }], placeId: null };

  it('is accepted with now', () => {
    expect(planInputSchema.safeParse({ ...meal, window: NOW }).success).toBe(true);
  });

  it('is refused with now of another type', () => {
    expect(planInputSchema.safeParse({ ...meal, window: { from: null, until: null, now: 'yes' } }).success).toBe(false);
  });
});
