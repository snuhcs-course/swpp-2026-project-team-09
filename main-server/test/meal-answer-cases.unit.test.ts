/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type AnswerPerson } from '../src/assistant/gathering/meal-answer.js';
import {
  answerOf,
  firstPlan,
  HAEUN,
  haeun,
  JIEUN,
  me,
  ME,
  MINSU,
  minsu,
  person,
  plain,
  strong,
  time,
} from './meal-answers.js';
import { classAt, id, readWorld } from './worked-example.js';

// The lines of a plan alone and with one Friend, a Friend whose position is unknown, and each reason for no plan, on
// the design's worked example (Tuesday 2026-11-17, asked at 11:50).

beforeAll(() => readWorld());

const withHaeun = (): AnswerReply => answerOf([me(), haeun()], { aloneMinutes: 55 });

describe('Lunch alone', () => {
  it('gives the place and the minutes, then when to leave, without walking at 301동', () => {
    const { plans } = answerOf([me()]);

    expect(plans[0]?.lines).toEqual([[strong('301동식당'), plain(' · 식사 55분')], [plain('12:45엔 나서야 해요')]]);
  });

  it('gives the walk too at the Student Center', () => {
    const { plans } = answerOf([me()]);

    expect(plans[1]?.id).toBe('학생회관식당');
    expect(plans[1]?.lines[1]).toEqual([plain('15분을 걷고 12:59엔 나서야 해요')]);
  });

  it("gives the asker's way to a place they walk to", () => {
    const { plans } = answerOf([me()]);

    expect(plans[1]?.basis).toEqual([
      '301동 → 학생회관식당 걸어서 15분',
      '학생회관식당 → 24동 걸어서 1분, 그래서 12:59에 나서요',
    ]);
  });
});

describe('Lunch with 민수', () => {
  it('says how much shorter the meal is at 301동 than alone', () => {
    const { plans } = answerOf([me(), minsu()], { aloneMinutes: 55 });
    const at301 = plans.find(({ id: key }) => key === '301동식당');

    expect(at301?.lines[1]).toEqual([plain('같이 먹으면 식사가 28분 줄어요')]);
  });
});

describe('A Friend whose position the asker may not see', () => {
  it('reads 자리 모름 on their chip', () => {
    expect(withHaeun().chips.at(-1)).toEqual({ kind: 'person', text: '하은 · 자리 모름', userId: HAEUN });
  });

  it('says that nobody knows where they are', () => {
    expect(firstPlan(withHaeun()).basis[0]).toBe('하은은 지금 어디 있는지 몰라요');
  });

  it('is neither drawn nor given a route', () => {
    const { scene } = firstPlan(withHaeun());

    expect(scene.people.map(({ userId }) => userId)).toEqual([ME]);
    expect(scene.routes.map(({ userId }) => userId)).not.toContain(HAEUN);
  });
});

describe('A meeting, when a Friend who comes on their own arrives last', () => {
  // 지은's Class ends at 12:50 and she reaches the Jahayeon cafeteria at 12:53. The asker and 민수 could be there at
  // 12:35, so they meet as late as still has them there at 12:53: at 12:36, 17 minutes away.
  it('moves with the start, and the legs of the walk stay what they are', () => {
    const asker = person(ME, '유상', [classAt('11:00', '11:50', '제1공학관')]);
    const late = person(JIEUN, '지은', [classAt('12:00', '12:50', '두산인문관')]);

    const { id: key, startAt, meeting, subQuests, basis, scene } = firstPlan(answerOf([asker, minsu(), late]));

    expect({ key, startAt }).toEqual({ key: '자하연식당', startAt: time('12:53') });
    expect(meeting?.at).toBe(time('12:36'));
    expect(subQuests[0]).toMatchObject({ at: time('12:36'), title: '유상, 민수: 301동 앞에서 만나기' });
    expect(basis[0]).toBe('민수 12:15 302동 수업 끝 · 301동까지 걸어서 3분, 같이 17분');
    expect(scene.routes[0]).toMatchObject({ role: 'friend', minutes: 3 });
    expect(scene.flags[1]?.text).toBe('12:36 민수와 만남');
  });
});

describe('A Friend who sets out from the asker’s own Place', () => {
  it('walks the whole way with the asker', () => {
    const neighbour = person(MINSU, '민수', [classAt('11:00', '11:50', '제1공학관')]);

    const { basis } = firstPlan(
      answerOf([me(), neighbour], { candidates: [{ key: '학생회관식당', placeId: id('학생회관') }] }),
    );

    expect(basis[0]).toBe('민수 301동 수업 끝 · 같이 걸어서 15분');
  });
});

describe('No plan', () => {
  it('says that no menu was collected that day', () => {
    const { plans, noPlan } = answerOf([me()], { menus: 'none', candidates: [] });

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({ reason: 'no-menu', lines: [[plain('그날은 수집된 메뉴가 없어요')]] });
  });

  it('says that no Restaurant is open for that meal', () => {
    const { plans, noPlan } = answerOf([me()], { menus: 'closed', candidates: [] });

    expect(plans).toEqual([]);
    expect(noPlan).toEqual({ reason: 'no-menu', lines: [[plain('그 끼니에 여는 식당이 없어요')]] });
  });

  it('says that they share no free time then', () => {
    const busy = person(MINSU, '민수', [classAt('11:00', '14:30', '제2공학관')]);

    expect(answerOf([me(), busy]).noPlan).toEqual({
      reason: 'no-shared-time',
      lines: [[plain('그 시간에는 같이 비는 시간이 없어요')]],
    });
  });

  it('says that the asker alone has no free time then', () => {
    const busy = person(ME, '유상', [classAt('11:00', '14:30', '제1공학관')]);

    expect(answerOf([busy]).noPlan).toEqual({
      reason: 'no-shared-time',
      lines: [[plain('그 시간에는 비는 시간이 없어요')]],
    });
  });

  it('says that no Restaurant can be reached in the time', () => {
    const late = person(ME, '유상', [classAt('11:00', '12:10', '제1공학관'), classAt('12:30', '14:30', '제1공학관')]);

    expect(answerOf([late], { candidates: [{ key: '학생회관식당', placeId: id('학생회관') }] }).noPlan).toEqual({
      reason: 'no-fit',
      lines: [[plain('시간 안에 다녀올 수 있는 식당이 없어요')]],
    });
  });
});

// Classes in 301동 until 12:10 and from 12:30: nowhere is reached in between.
const late = (): AnswerPerson =>
  person(ME, '유상', [classAt('11:00', '12:10', '제1공학관'), classAt('12:30', '14:30', '제1공학관')]);

describe('The chips without a plan', () => {
  it('come from the sides of the shared time when nothing fits', () => {
    expect(answerOf([late()], { candidates: [] }).chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '12:30 수업까지', userId: null },
    ]);
  });

  it('read 자리 모름 for a Friend whose origin is unknown when nothing fits', () => {
    expect(answerOf([late(), haeun()], { candidates: [] }).chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '12:30 수업까지', userId: null },
      { kind: 'person', text: '하은 · 자리 모름', userId: HAEUN },
    ]);
  });

  it("are the Friends' names only when no time is shared", () => {
    const busy = person(MINSU, '민수', [classAt('11:00', '14:30', '제2공학관')]);

    expect(answerOf([me(), busy]).chips).toEqual([{ kind: 'person', text: '민수', userId: MINSU }]);
  });
});
