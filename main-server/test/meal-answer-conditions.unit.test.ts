/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-14  Fable 5.2  prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import {
  answerOf,
  type Fixed,
  HAEUN,
  haeun,
  jieun,
  me,
  ME,
  minsu,
  MINSU,
  person,
  plain,
  time,
} from './meal-answers.js';
import { at, classAt, id, readWorld } from './worked-example.js';

// The words of an answer under what the User fixed (the window, a person's origin, and their leave-by), on the design's
// worked example (Tuesday 2026-11-17, asked at 11:50).

beforeAll(() => readWorld());

const window = (from: string | null, until: string | null): Fixed => ({ window: { from, until } });

const secondLine = (answer: AnswerReply, key: string): AnswerReply['plans'][number]['lines'][number] | undefined =>
  answer.plans.find((plan) => plan.id === key)?.lines[1];

describe('A plan that starts later than the window', () => {
  it('says when the Friend who arrives last is there', () => {
    const answer = answerOf([me(), jieun()], { aloneMinutes: 55, fixed: window('12:00', null) });

    expect(secondLine(answer, '자하연식당')).toEqual([plain('지은이 12:18에 도착해요')]);
    expect(secondLine(answer, '학생회관식당')).toEqual([plain('지은이 12:20에 도착해요')]);
  });

  it('says when the asker is there when they arrive last', () => {
    expect(secondLine(answerOf([me()], { fixed: window('11:50', null) }), '학생회관식당')).toEqual([
      plain('12:05에야 도착해요'),
    ]);
  });

  it('keeps the lines of before when it starts as the window opens', () => {
    expect(secondLine(answerOf([me()], { fixed: window('11:50', null) }), '301동식당')).toEqual([
      plain('12:45엔 나서야 해요'),
    ]);
  });
});

describe("A plan held by the meal's own window", () => {
  it('says from when the meal is served when that is later than the window', () => {
    const early = person(ME, '유상', [
      classAt('09:00', '09:50', '제1공학관'),
      classAt('13:00', '13:50', '자연과학관6'),
    ]);

    const plan = answerOf([early], { now: at('10:00'), fixed: window('10:30', null) }).plans.find(
      ({ id: key }) => key === '301동식당',
    );

    expect([plan?.startAt, plan?.endAt, plan?.lines[1]]).toEqual([
      time('11:00'),
      time('12:45'),
      [plain('점심은 11:00부터예요')],
    ]);
  });

  it('says until when the meal is served when that is earlier than the window, with no until chip', () => {
    const free = person(ME, '유상', [classAt('11:00', '11:50', '제1공학관')]);

    const answer = answerOf([free], { fixed: window(null, '15:00') });
    const plan = answer.plans.find(({ id: key }) => key === '301동식당');

    expect([plan?.startAt, plan?.endAt, plan?.lines[1]]).toEqual([
      time('11:50'),
      time('14:30'),
      [plain('점심은 14:30까지예요')],
    ]);
    expect(answer.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
  });
});

describe('A plan whose start a person holds', () => {
  it('names the one of two who merge that comes later', () => {
    const free = person(ME, '유상', [classAt('11:00', '11:50', '제1공학관')]);
    const late = person(MINSU, '민수', [classAt('12:00', '12:50', '제2공학관')]);

    const plan = answerOf([free, late], { aloneMinutes: 55, fixed: window('12:30', null) }).plans.find(
      ({ id: key }) => key === '학생회관식당',
    );

    expect([plan?.meeting?.at, plan?.startAt, plan?.lines[1]]).toEqual([
      time('12:53'),
      time('13:08'),
      [plain('민수가 13:08에 도착해요')],
    ]);
  });

  it('says from when a Friend whose position is unknown can come', () => {
    const notBefore = { kind: 'notBefore' as const, time: '12:30', source: 'asker' as const };

    const plan = answerOf([me(), haeun()], {
      aloneMinutes: 55,
      fixed: { window: { from: '12:00', until: null }, constraints: { [HAEUN]: [notBefore] } },
    }).plans.find(({ id: key }) => key === '301동식당');

    expect([plan?.startAt, plan?.endAt, plan?.lines[1]]).toEqual([
      time('12:30'),
      time('12:45'),
      [plain('하은은 12:30부터 가능해요')],
    ]);
  });
});

describe('A plan that ends earlier than the window', () => {
  it('says when the Friend who leaves first must leave', () => {
    const answer = answerOf([me(), jieun()], { aloneMinutes: 55, fixed: window(null, '13:00') });

    expect(secondLine(answer, '학생회관식당')).toEqual([plain('지은은 12:55에 나서야 해요')]);
  });

  it('says when the asker must leave when they leave first', () => {
    expect(secondLine(answerOf([me()], { fixed: window(null, '13:30') }), '학생회관식당')).toEqual([
      plain('12:59엔 나서야 해요'),
    ]);
  });

  it('keeps the lines of before when it ends as the window closes', () => {
    const answer = answerOf([me(), minsu()], { aloneMinutes: 55, fixed: window(null, '12:43') });

    expect(secondLine(answer, '302동식당')).toEqual([plain('같이 먹으면 식사가 27분 줄어요')]);
  });

  it('says the start when both sides of the window are not met', () => {
    const answer = answerOf([me(), jieun()], { aloneMinutes: 55, fixed: window('12:00', '13:00') });

    expect(secondLine(answer, '학생회관식당')).toEqual([plain('지은이 12:20에 도착해요')]);
  });
});

const leaveBy = (clock: string): Fixed => ({
  constraints: { [ME]: [{ kind: 'leaveBy', time: clock, source: 'asker' }] },
});

const from = (userId: string, name: string): Fixed => ({
  constraints: { [userId]: [{ kind: 'from', placeId: id(name), source: 'asker' }] },
});

describe("The chip of the asker's end", () => {
  it("reads the window's end when it is earlier than the next Class", () => {
    expect(answerOf([me(), minsu()], { fixed: window(null, '12:30') }).chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '12:30까지', userId: null },
      { kind: 'person', text: '민수', userId: MINSU },
    ]);
  });

  it('reads the next Class when the window ends later', () => {
    expect(answerOf([me(), minsu()], { fixed: window(null, '13:30') }).chips[1]).toEqual({
      kind: 'until',
      text: '13:00 수업까지',
      userId: null,
    });
  });

  it("reads the asker's own leave-by when it is earlier than the next Class", () => {
    expect(answerOf([me(), minsu()], { fixed: leaveBy('12:40') }).chips[1]).toEqual({
      kind: 'until',
      text: '12:40까지',
      userId: null,
    });
  });

  it("reads the window's end when nothing follows", () => {
    const free = person(ME, '유상', [classAt('11:00', '11:50', '제1공학관')]);

    expect(answerOf([free], { fixed: window(null, '13:30') }).chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null },
      { kind: 'until', text: '13:30까지', userId: null },
    ]);
  });
});

describe('A chosen origin', () => {
  it("names the asker's chosen Place on the origin chip", () => {
    expect(answerOf([me(), minsu()], { fixed: from(ME, '학생회관') }).chips[0]).toEqual({
      kind: 'origin',
      text: '63동에서',
      userId: null,
    });
  });

  it("makes a Friend's origin known on their chip", () => {
    expect(answerOf([me(), haeun()], { fixed: from(HAEUN, '학생회관') }).chips.at(-1)).toEqual({
      kind: 'person',
      text: '하은',
      userId: HAEUN,
    });
  });

  it("starts a Friend's line of the basis with where they set out from", () => {
    const { plans } = answerOf([me(), minsu()], { fixed: from(MINSU, '제1공학관') });

    expect(plans.find(({ id: key }) => key === '학생회관식당')?.basis[0]).toBe('민수 301동에서 · 같이 걸어서 15분');
  });
});

describe('A Friend who is ready later than their Class ends', () => {
  it('keeps the end of the Class in their line of the basis, and says from when they can come', () => {
    const notBefore = { kind: 'notBefore' as const, time: '12:20', source: 'asker' as const };

    const { plans } = answerOf([me(), minsu()], { fixed: { constraints: { [MINSU]: [notBefore] } } });

    expect(plans.find(({ id: key }) => key === '학생회관식당')?.basis[0]).toBe(
      '민수 12:15 302동 수업 끝 · 12:20부터 가능 · 301동까지 걸어서 3분, 같이 15분',
    );
  });
});

const rangeOf = (fixed: Fixed): object | undefined =>
  answerOf([me(), minsu()], { fixed }).plans.find(({ id: key }) => key === '302동식당')?.band.range;

describe('The time band under a fixed window', () => {
  it('reaches out to the half hours around the window', () => {
    expect(rangeOf(window('11:10', '13:40'))).toEqual({ startAt: time('11:00'), endAt: time('14:00') });
  });

  it('stays as it was when the window lies inside it', () => {
    expect(rangeOf(window('12:10', '12:50'))).toEqual({ startAt: time('11:30'), endAt: time('13:30') });
  });
});

describe('A fixed Place', () => {
  it('says that no Restaurant is open there', () => {
    const answer = answerOf([me()], { menus: 'closed-at-place', candidates: [], fixed: { placeId: id('학생회관') } });

    expect(answer.noPlan).toEqual({ reason: 'no-fit', lines: [[plain('그곳에는 여는 식당이 없어요')]] });
  });
});
