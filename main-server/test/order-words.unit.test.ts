/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { orderWords } from '../src/assistant/gathering/plan-order.js';
import { answerOf, ME, MINSU, person } from './meal-answers.js';
import { at, classAt, id, readWorld } from './worked-example.js';

// What the model is told of the order when the User's origin is unknown (P05 tickets 45 and 46), on the seed's walking
// table. Reported on 2026-11-23: "배고파" from home, the first Class over at 10:45 in 301동 and the next at 15:30 in
// 302동. 301동식당 and 302동식당, nearest to 302동, serve until 13:30. A Restaurant's closing is when it last serves:
// one reached before its last 10 minutes of serving fits with a whole meal, one reached after is dropped.

beforeAll(() => readWorld());

const serving = (key: string, building: string, opens: string, closes: string): GatheringPlace => ({
  key,
  placeId: id(building),
  window: { start: at(opens), end: at(closes) },
});

const lunches = (): GatheringPlace[] => [
  serving('301동식당', '제1공학관', '11:30', '13:30'),
  serving('302동식당', '제2공학관', '11:30', '13:30'),
  serving('3식당', '제3학생식당', '11:00', '14:00'),
  serving('학생회관식당', '학생회관', '11:00', '14:30'),
];

const myDay = (): DayItem[] => [classAt('09:30', '10:45', '제1공학관'), classAt('15:30', '16:45', '제2공학관')];

// The asker alone with no position, the first Class over and the next ahead.
const fromHome = (clock = '13:05', items = myDay()): AnswerReply =>
  answerOf([person(ME, '유상', items)], { now: at(clock), candidates: lunches() });

describe('The order told at 13:05 with no position, the next Class at 15:30 in 302동', () => {
  it('puts 302동식당 and 301동식당 first: reached before 13:20, they serve a whole meal', () => {
    expect(fromHome().plans.map(({ id: key, togetherMinutes }) => [key, togetherMinutes])).toEqual([
      ['302동식당', 60],
      ['301동식당', 60],
      ['3식당', 60],
      ['학생회관식당', 60],
    ]);
  });

  it('says the 30 minutes come first, then the walk on to 15:30 302동 수업, not nearness to where the User is', () => {
    const { order } = orderWords(fromHome().plans);

    expect(order).toBe(
      "Not by nearness: where the User sets out from is not known. The plans where everyone has 30 minutes or more come first, then the shorter ones, and in each the order is by the least walking from the Restaurant on to the User's next item, 15:30 302동 수업. Never call this order 가까운 순서.",
    );
  });

  it('names no plan that fell back: serving ending at 13:30 ends no meal', () => {
    expect(orderWords(fromHome().plans)).not.toHaveProperty('fellBack');
  });
});

describe('The order told at 13:34, as reported', () => {
  it('drops 302동식당 and 301동식당, whose serving ends at 13:30, and puts 3식당 first by the walk on to 302동', () => {
    const { plans, dropped } = fromHome('13:34');

    expect(plans.map(({ id: key }) => key)).toEqual(['3식당', '학생회관식당']);
    expect(dropped.map(({ place, reason }) => [place.label, reason])).toEqual([
      ['301동식당', '13:30에 배식이 끝나요'],
      ['302동식당', '13:30에 배식이 끝나요'],
    ]);
    expect(orderWords(plans)).not.toHaveProperty('fellBack');
  });
});

describe('A nearer plan the 30 minutes put after the first because a Friend must leave', () => {
  it('names it, with when the Friend must leave, as words to say', () => {
    const minsu = person(MINSU, '민수', [classAt('13:50', '15:00', '학생회관')]);
    const { plans } = answerOf([person(ME, '유상', myDay()), minsu], { now: at('13:05'), candidates: lunches() });

    expect(plans.at(-1)).toMatchObject({ id: '302동식당', togetherMinutes: 28 });
    expect(orderWords(plans).fellBack).toBe('302동식당은 13:33엔 나서야 해서 28분뿐이에요');
  });
});

describe('The order told with no position and nothing ahead', () => {
  it('says the 30 minutes come first, then the earliest start, and names none that fell back by walking', () => {
    const words = orderWords(fromHome('13:05', [classAt('09:30', '10:45', '제1공학관')]).plans);

    expect(words.order).toContain('in each the order is by the earliest start, then the longest time to eat');
    expect(words).not.toHaveProperty('fellBack');
  });
});

describe('The order told with the origin known', () => {
  it('is nothing: the plans come least travel first from where the User sets out', () => {
    const inClass = [classAt('12:00', '13:05', '제1공학관'), classAt('15:30', '16:45', '제2공학관')];

    expect(orderWords(fromHome('13:05', inClass).plans)).toEqual({});
  });

  it('is nothing without a plan', () => {
    expect(orderWords([])).toEqual({});
  });
});
