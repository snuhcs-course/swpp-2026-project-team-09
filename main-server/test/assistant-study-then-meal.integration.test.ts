/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { menusMessage, restaurant } from './menus.js';
import { type Step } from './scripted-model.js';
import { ANSWERS_APP, askerConstraints, chainFrom, clock, DATE, OLD_APP, StepsStage } from './steps-stage.js';
import { sendAsWorker } from './worker.js';

// "아침 7시에 도서관 갔다가 점심", asked at 01:20 far from campus, as on the user's phone on 2026-11-28 (P05 ticket 76):
// a study place from 07:00 (no 관정 named, so the study plan), then lunch. For an app that says `answers` it is two
// answers and two steps, and lunch sets out from the study place when the stay there ends, already while the model
// plans it, so that the model never says it does not know where the User starts.

const steps = new StepsStage();
const { stage } = steps;

const WORDS = '아침 7시에 도서관 갔다가 점심';
const RESTAURANTS = ['301동식당', '학생회관식당', '자하연식당 2층'];
const FAR = { locationMissing: 'off-campus' };

beforeAll(() => steps.start());

afterAll(() => steps.stop());

beforeEach(async () => {
  await stage.asking(DATE, '01:20');
  await sendAsWorker(
    stage.app,
    '/menus/collected',
    menusMessage([{ date: DATE, restaurants: RESTAURANTS.map((name) => restaurant({ name })) }]),
  );
});

const STUDY: Step = { tool: 'planStudy', input: { what: 'any', from: '07:00' } };
const LUNCH: Step = { tool: 'planMeal', input: { date: DATE, meal: 'lunch' } };
const SAID: Step = { text: '아침에 공부하고, 점심을 짰어요.' };

const plannedSchema = z.object({
  plans: z.array(z.object({ people: z.array(z.object({ from: z.string().nullable().optional() })) })),
});

const placeOf = (answer: AnswerReply | undefined): string | undefined => answer?.plans[0]?.place.placeId;

describe('"아침 7시에 도서관 갔다가 점심" from an app that says answers', () => {
  it('is two answers and two steps, study then lunch, and lunch sets out from the study place when it ends', async () => {
    const reply = await steps.asked([STUDY, LUNCH, SAID], WORDS, ANSWERS_APP, FAR);
    const [study, lunch] = reply.answers ?? [];

    expect(reply.answers?.map(({ input }) => input.kind)).toEqual(['study', 'meal']);
    expect(reply.steps?.map(({ kind, status }) => ({ kind, status }))).toEqual([
      { kind: 'study', status: 'shown' },
      { kind: 'meal', status: 'shown' },
    ]);
    expect(askerConstraints(lunch?.input)).toEqual(
      chainFrom(placeOf(study) ?? '-', clock(study?.plans[0]?.endAt) ?? '-'),
    );
    expect(lunch?.plans[0]?.parts[0]?.origin).toMatchObject({ place: { placeId: placeOf(study) }, basis: 'chosen' });
  });

  it('gives the model the lunch it plans as setting out from the study place, as the app shows it', async () => {
    const reply = await steps.asked([STUDY, LUNCH, SAID], WORDS, ANSWERS_APP, FAR);

    const planned = plannedSchema.parse(stage.model.toolResults()[1]);
    const origin = reply.answers?.[1]?.plans[0]?.parts[0]?.origin?.place;
    expect(origin?.placeId).toBe(placeOf(reply.answers?.[0]));
    expect(planned.plans[0]?.people[0]?.from).toBe(origin?.label);
  });
});

describe('"아침 7시에 도서관 갔다가 점심" from an app before it', () => {
  it('stays one answer, lunch, and no steps, as before', async () => {
    const reply = await steps.asked([STUDY, LUNCH, SAID], WORDS, OLD_APP, FAR);

    expect(reply).not.toHaveProperty('answers');
    expect(reply).not.toHaveProperty('steps');
    expect(reply.answer?.input.kind).toBe('meal');
  });
});
