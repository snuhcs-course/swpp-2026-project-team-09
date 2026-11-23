/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PersonConstraint } from '../src/assistant/dto/answer.dto.js';
import { JIEUN, ME, MINSU, person, plain, time } from './meal-answers.js';
import { answerFor, NOW_WINDOW, readUnmetWorld } from './unmet-answers.js';
import { classAt, id, restaurants } from './worked-example.js';

// What the words of a meal whose conditions cannot be met name (P02-14): only what stands in the way of a meal 지금,
// and each Restaurant's hours where a Plan is measured, on the worked example's Places, Tuesday 2026-11-17.

beforeAll(() => readUnmetWorld());

describe('A meal 지금 that nothing fits', () => {
  it('says when dinner starts, not a Class after it, for the asker alone at 15:00', () => {
    const day = person(ME, '유상', [classAt('13:00', '14:45', '제1공학관'), classAt('18:00', '19:15', '제1공학관')]);

    const { noPlan } = answerFor({ people: [day], clock: '15:00', meal: 'dinner', window: NOW_WINDOW });

    expect(noPlan?.lines).toEqual([[plain('지금은 먹을 때가 없어요')], [plain('저녁은 17:00부터예요')]]);
    expect(noPlan?.relax).toEqual([{ kind: 'from', time: '17:00', label: '17:00 이후' }]);
  });

  // The asker must leave 24동 for a Class at 12:30; 민수 is free from 11:50 in 302동, 17 minutes away.
  it('names no Class of a Friend free now but too far, when it starts long after', () => {
    const mine = person(ME, '유상', [
      classAt('11:00', '11:55', '자연과학관6'),
      classAt('12:30', '13:45', '자연과학관6'),
    ]);
    const far = person(MINSU, '민수', [classAt('11:00', '11:50', '제2공학관'), classAt('16:00', '17:15', '제2공학관')]);

    const { noPlan } = answerFor({ people: [mine, far], clock: '12:00', window: NOW_WINDOW });

    expect(noPlan?.relax?.[0]).toEqual({ kind: 'without', userId: MINSU, label: '민수 빼고 보기' });
    expect(noPlan?.lines).toEqual([[plain('지금은 둘이 먹을 때가 없어요')]]);
  });

  // The User holds 지은 until 12:15, and the asker must leave for a Class at 12:30.
  it('names no Class of a Friend the User holds until later, when it starts long after', () => {
    const mine = person(ME, '유상', [
      classAt('11:00', '11:50', '자연과학관6'),
      classAt('12:30', '13:45', '자연과학관6'),
    ]);
    const held = person(JIEUN, '지은', [
      classAt('11:00', '11:50', '두산인문관'),
      classAt('16:00', '17:15', '두산인문관'),
    ]);
    const notBefore: PersonConstraint = { kind: 'notBefore', time: '12:15', source: 'asker' };

    const { noPlan } = answerFor({
      people: [mine, held],
      clock: '11:50',
      window: NOW_WINDOW,
      constraints: [[], [notBefore]],
    });

    expect(noPlan?.relax?.[0]).toEqual({ kind: 'without', userId: JIEUN, label: '지은 빼고 보기' });
    expect(noPlan?.lines).toEqual([[plain('지금은 둘이 먹을 때가 없어요')]]);
  });
});

describe('A meal 지금 eased to a later start', () => {
  it("says dinner starts then, not a Class that ended before dinner's opening", () => {
    const mine = person(ME, '유상', [classAt('13:00', '14:45', '제1공학관')]);
    const theirs = person(MINSU, '민수', [classAt('13:00', '15:30', '제2공학관')]);
    const hers = person(JIEUN, '지은', [classAt('14:00', '16:15', '두산인문관')]);
    const window = { from: '17:00', until: null, now: true };

    const [first] = answerFor({ people: [mine, theirs, hers], clock: '15:00', meal: 'dinner', window }).plans;

    expect(first?.basis[0]).toBe('저녁은 17:00부터예요');
  });
});

describe("A Plan's words, measured by its Restaurant's hours", () => {
  it('says a Restaurant opens after the start the User fixed, not that the asker arrives late', () => {
    const day = person(ME, '유상', [classAt('09:00', '10:45', '제1공학관')]);
    const hours = restaurants().map(({ key }) =>
      key === '301동식당' ? { opensAt: '11:30', closesAt: '14:00' } : null,
    );

    const { plans } = answerFor({ people: [day], clock: '10:50', window: { from: '11:00', until: null }, hours });

    expect(plans.find(({ id: key }) => key === '301동식당')?.lines[1]).toEqual([plain('301동식당은 11:30에 열어요')]);
  });

  // One who comes in the last 10 minutes of serving is not offered it (P05 ticket 46).
  it('says when a fixed Place stops serving and when the asker arrives, when that is in its last 10 minutes', () => {
    const day = person(ME, '유상', [classAt('12:30', '13:45', '자연과학관6')]);
    const place = { key: '학생회관식당', placeId: id('학생회관') };

    const { noPlan } = answerFor({
      people: [day],
      clock: '13:47',
      candidates: [place],
      hours: [{ opensAt: '11:00', closesAt: '13:55' }],
      placeId: place.placeId,
    });

    expect(noPlan?.lines).toEqual([[plain('13:55에 배식이 끝나요')], [plain('나는 13:48에 도착해요')]]);
  });

  it('plans a whole meal at a fixed Place reached before its last 10 minutes of serving', () => {
    const day = person(ME, '유상', [classAt('12:30', '13:45', '자연과학관6')]);
    const place = { key: '학생회관식당', placeId: id('학생회관') };

    const { plans } = answerFor({
      people: [day],
      clock: '13:47',
      candidates: [place],
      hours: [{ opensAt: '11:00', closesAt: '14:00' }],
      placeId: place.placeId,
    });

    expect(plans[0]).toMatchObject({ id: '학생회관식당', startAt: time('13:48'), togetherMinutes: 60 });
  });
});
