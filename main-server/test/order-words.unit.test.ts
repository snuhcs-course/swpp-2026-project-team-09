/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { type GatheringPlace } from '../src/assistant/gathering/gathering.js';
import { orderWords } from '../src/assistant/gathering/plan-order.js';
import { answerOf, ME, person } from './meal-answers.js';
import { at, classAt, id, readWorld } from './worked-example.js';

// What the model is told of the order when the User's origin is unknown (P05 ticket 45), on the seed's walking table.
// Reported on 2026-11-23: "배고파" at 13:05 from home, the first Class over at 10:45 in 301동 and the next at 15:30 in
// 302동. The plans came 3식당 first while the reply said they were ordered by nearness to 302동: 301동식당 and
// 302동식당, nearer to it, close at 13:30 and fell after 3식당 for having under 30 minutes.

beforeAll(() => readWorld());

const serving = (key: string, building: string, opens: string, closes: string): GatheringPlace => ({
  key,
  placeId: id(building),
  window: { start: at(opens), end: at(closes) },
  closesAt: at(closes),
});

const lunches = (): GatheringPlace[] => [
  serving('301동식당', '제1공학관', '11:30', '13:30'),
  serving('302동식당', '제2공학관', '11:30', '13:30'),
  serving('3식당', '제3학생식당', '11:00', '14:00'),
  serving('학생회관식당', '학생회관', '11:00', '14:30'),
];

// The asker alone with no position, the first Class over and the next ahead.
const fromHome = (
  items = [classAt('09:30', '10:45', '제1공학관'), classAt('15:30', '16:45', '제2공학관')],
): AnswerReply => answerOf([person(ME, '유상', items)], { now: at('13:05'), candidates: lunches() });

describe('The order told at 13:05 with no position, the next Class at 15:30 in 302동', () => {
  it('keeps the order: 3식당 first, and 302동식당 and 301동식당 after it for their 25 minutes', () => {
    expect(fromHome().plans.map(({ id: key, togetherMinutes }) => [key, togetherMinutes])).toEqual([
      ['3식당', 55],
      ['학생회관식당', 85],
      ['302동식당', 25],
      ['301동식당', 25],
    ]);
  });

  it('says the 30 minutes come first, then the walk on to 15:30 302동 수업, not nearness to where the User is', () => {
    const { order } = orderWords(fromHome().plans);

    expect(order).toBe(
      "Not by nearness: where the User sets out from is not known. The plans where everyone has 30 minutes or more come first, then the shorter ones, and in each the order is by the least walking from the Restaurant on to the User's next item, 15:30 302동 수업. Never call this order 가까운 순서.",
    );
  });

  it('names the nearer plans the 30 minutes put after the first, and why, as words to say', () => {
    expect(orderWords(fromHome().plans).fellBack).toBe('302동식당과 301동식당은 13:30에 닫아 25분뿐이에요');
  });
});

describe('The order told with no position and nothing ahead', () => {
  it('says the 30 minutes come first, then the earliest start, and names none that fell back by walking', () => {
    const words = orderWords(fromHome([classAt('09:30', '10:45', '제1공학관')]).plans);

    expect(words.order).toContain('in each the order is by the earliest start, then the longest time to eat');
    expect(words).not.toHaveProperty('fellBack');
  });
});

describe('The order told with the origin known', () => {
  it('is nothing: the plans come least travel first from where the User sets out', () => {
    const inClass = [classAt('12:00', '13:05', '제1공학관'), classAt('15:30', '16:45', '제2공학관')];

    expect(orderWords(fromHome(inClass).plans)).toEqual({});
  });

  it('is nothing without a plan', () => {
    expect(orderWords([])).toEqual({});
  });
});
