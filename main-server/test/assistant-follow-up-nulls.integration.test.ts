/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { addDays } from '../src/assistant/library/booking-rules.js';
import { MealPlanStage, resolve } from './meal-plan.js';
import { menusMessage, restaurant } from './menus.js';
import { answerIn } from './plan-answers.js';
import { type Step } from './scripted-model.js';
import { sendAsWorker } from './worker.js';

// A condition said in the message after a meal's answer (P05 ticket 82). On the user's phone on 2026-11-28 at 16:01,
// after "월요일 점심 뭐 먹지" with lunch until 13:00, "6천원 이하로" failed again and again, and the old answer stayed. The
// rules tell the model to call planMeal with the conditions on screen as they are, and the [Plan on screen] line gave an
// unset start and place as null, which planMeal's input refused. Each follow-up here copies the line's conditions, nulls
// included, as the model did. Partitions: each condition a follow-up says (price words, 싼 데, a kind of food, an end, a
// start, a Friend), for today's lunch and a later day's.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const SERVED: [string, string, number][] = [
  ['301동식당', '후속돈까스', 6000],
  ['학생회관식당', '후속라면', 4500],
  ['자하연식당 2층', '후속파스타', 7000],
];

async function menusOn(date: string): Promise<void> {
  const restaurants = SERVED.map(([name, dish, price]) =>
    restaurant({
      name,
      lines: [{ meal: 'lunch', text: `${dish} : ${price.toLocaleString('ko-KR')}원`, kind: 'dish', name: dish, price }],
    }),
  );
  await sendAsWorker(stage.app, '/menus/collected', menusMessage([{ date, restaurants }]));
}

// The answer of "점심 뭐 먹지" on that day, until 13:00.
async function lunchUntilOne(date: string): Promise<AnswerReply> {
  const planned = { tool: 'planMeal', input: { date, meal: 'lunch', until: '13:00' } };
  return answerIn((await stage.send([planned, { text: '…' }], {}, '점심 뭐 먹지')).body);
}

// The conditions as the [Plan on screen] line gave them, an unset start and place as null.
const onScreen = ({ input }: AnswerReply): object =>
  input.kind === 'meal'
    ? {
        date: input.date,
        meal: input.meal,
        friendIds: input.people.slice(1).map(({ userId }) => userId),
        from: input.window.from,
        until: input.window.until,
        placeId: input.placeId,
      }
    : {};

interface FollowUp {
  words: string;
  change: object;
  // What the new answer's conditions hold.
  holds: object;
  friend?: true;
}

const FOLLOW_UPS: FollowUp[] = [
  { words: '6천원 이하로', change: { maxPrice: 6000 }, holds: { maxPrice: 6000 } },
  { words: '5천원 이하', change: { maxPrice: 5000 }, holds: { maxPrice: 5000 } },
  { words: '만원 안쪽', change: { maxPrice: 10_000 }, holds: { maxPrice: 10_000 } },
  { words: '6천원 정도', change: { maxPrice: 6000 }, holds: { maxPrice: 6000 } },
  { words: '싼 데', change: { cheapFirst: true }, holds: { cheapFirst: true } },
  { words: '제일 싼 데', change: { cheapFirst: true }, holds: { cheapFirst: true } },
  { words: '한식으로', change: { cuisine: '한식' }, holds: { cuisine: '한식' } },
  { words: '12:30까지만', change: { until: '12:30' }, holds: { window: { until: '12:30' } } },
  { words: '12시부터', change: { from: '12:00' }, holds: { window: { from: '12:00', until: '13:00' } } },
  { words: '민수도 불러 줘', change: {}, holds: {}, friend: true },
];

const DAYS = [
  ['today', 0],
  ['a later day', 2],
] as const;

describe.each(DAYS)("A condition said after %s's lunch answer, the conditions on screen copied", (_day, ahead) => {
  it.each(FOLLOW_UPS)('$words plans again with it', async ({ words, change, holds, friend }) => {
    await stage.asking('2193-01-08', '10:00');
    const date = addDays('2193-01-08', ahead);
    await menusOn(date);
    const minsu = friend === true ? await stage.friend('민수') : null;
    const shown = await lunchUntilOne(date);
    const friendIds = minsu === null ? [] : [minsu.id];
    const steps: Step[] = [
      ...(minsu === null ? [] : [resolve('민수')]),
      { tool: 'planMeal', input: { ...onScreen(shown), ...change, ...(minsu === null ? {} : { friendIds }) } },
      { text: '…' },
    ];

    const response = await stage.send(
      steps,
      { context: { conditions: shown.input, planId: shown.plans[0]?.id } },
      words,
    );

    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ kind: 'meal', date, meal: 'lunch', ...holds });
    const people = answer.input.kind === 'meal' ? answer.input.people.map(({ userId }) => userId) : [];
    expect(people).toEqual([stage.asker.id, ...friendIds]);
  });
});
