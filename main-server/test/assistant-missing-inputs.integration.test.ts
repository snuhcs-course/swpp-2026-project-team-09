/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, planMeal } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// Without a location or a Timetable (P02-13), a meal planned at the Assistant's endpoint with the scripted model, the
// seed's walking table, and Places: board n13 (no location permission) and board n15 (no Class at all), each on a
// Tuesday at 11:50, and the request context that says why the location is missing.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const RESTAURANTS = ['301동식당', '302동식당', '학생회관식당', '3식당', '자하연식당 2층'];

const replySchema = z.object({ answer: z.custom<AnswerReply | null>() });

function answerIn(body: unknown): AnswerReply {
  const { answer } = replySchema.parse(body);
  if (answer === null) {
    throw new Error('The reply has no answer');
  }
  return answer;
}

// The text of each line, its parts joined.
const linesOf = (lines: AnswerReply['plans'][number]['lines'] = []): string[] =>
  lines.map((line) => line.map(({ text }) => text).join(''));

async function lunchAt(date: string, clock: string): Promise<void> {
  await stage.asking(date, clock);
  await stage.menusOn(date, RESTAURANTS);
}

describe('Board n13: 배고파 without the location permission', () => {
  it('sets out from the building of the Class that ended, says so, and offers 위치 켜기', async () => {
    const date = '2079-01-03';
    await lunchAt(date, '11:50');
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    const response = await stage.send([planMeal(date), { text: '…' }], { context: { locationMissing: 'permission' } });

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.chips).toEqual([
      { kind: 'origin', text: '301동에서', userId: null, mark: 'assumed' },
      { kind: 'until', text: '13:00 수업까지', userId: null },
    ]);
    expect(linesOf(answer.plans[0]?.lines)).toEqual(['위치를 몰라 직전 수업의', '301동에서 출발로 잡았어요']);
    expect(answer.offers).toEqual([{ kind: 'open', label: '위치 켜기', screen: 'location' }]);
  });

  it('sets out from there long after the Class ended', async () => {
    const date = '2079-01-10';
    await lunchAt(date, '12:40');
    await stage.classAt(stage.asker, '09:00', '10:15', '301');
    await stage.classAt(stage.asker, '15:00', '16:15', '24');

    const response = await stage.send([planMeal(date), { text: '…' }], { context: { locationMissing: 'permission' } });

    const answer = answerIn(response.body);
    expect(answer.chips[0]).toEqual({ kind: 'origin', text: '301동에서', userId: null, mark: 'assumed' });
    expect(answer.plans[0]?.parts[0]?.origin).toMatchObject({ basis: 'timetable', place: { label: '301동' } });
  });
});

describe('A recalculation of board n13', () => {
  it('keeps the assumed origin when it says the permission is missing', async () => {
    const date = '2079-01-31';
    await lunchAt(date, '12:40');
    await stage.classAt(stage.asker, '09:00', '10:15', '301');
    const asked = await stage.send([planMeal(date), { text: '…' }], { context: { locationMissing: 'permission' } });
    const { input } = answerIn(asked.body);

    const response = await withAccessToken(
      request(stage.app.getHttpServer()).post('/assistant/answers'),
      stage.asker.accessToken,
    ).send({
      input: { ...input, window: { from: '13:00', until: null } },
      location: null,
      locationMissing: 'permission',
    });

    expect(response.status).toBe(200);
    const answer = z.custom<AnswerReply>().parse(response.body);
    expect(answer.chips[0]).toEqual({ kind: 'origin', text: '301동에서', userId: null, mark: 'assumed' });
    expect(answer.offers).toEqual([{ kind: 'open', label: '위치 켜기', screen: 'location' }]);
  });
});

describe('Board n15: 배고파 with no Class in the Timetable', () => {
  it('browses the Restaurants nearest first, says the first is the nearest, and offers 시간표 넣기', async () => {
    const date = '2079-01-17';
    await lunchAt(date, '11:50');
    const { latitude, longitude } = await stage.numbered('301');

    const response = await stage.send([planMeal(date), { text: '…' }], {
      context: { location: { latitude, longitude }, locationMissing: null },
    });

    const answer = answerIn(response.body);
    const walks = answer.plans.map(({ parts }) => parts[0]?.walkMinutes ?? 0);
    expect(walks).toEqual(walks.toSorted((a, b) => a - b));
    expect(answer.chips).toEqual([{ kind: 'origin', text: '301동에서', userId: null }]);
    expect(linesOf(answer.plans[0]?.lines)).toEqual(['301동식당이 가장 가까워요']);
    expect(answer.plans[0]?.basis[0]).toBe('시간표가 없어 가까운 순서로 넘겨 봐요');
    expect(answer.note).toBe('시간표를 넣으면 나설 시각까지 알려 드려요');
    expect(answer.offers).toEqual([{ kind: 'open', label: '시간표 넣기', screen: 'timetable' }]);
  });
});

describe("The request context's reason for a missing location", () => {
  it.each([['permission'], ['off-campus'], [null]])('is accepted as %s', async (locationMissing) => {
    await stage.asking('2079-01-24', '11:50');

    const response = await stage.send([{ text: '네' }], { context: { locationMissing } });

    expect(response.status).toBe(200);
  });

  it('is refused with 400 for any other reason, and the model is not called', async () => {
    await stage.asking('2079-01-24', '11:50');

    const response = await stage.send([{ text: '네' }], { context: { locationMissing: 'airplane-mode' } });

    expect(response.status).toBe(400);
    expect(stage.model.received()).toHaveLength(0);
  });
});
