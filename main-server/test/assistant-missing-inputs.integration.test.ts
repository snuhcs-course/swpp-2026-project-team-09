/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, planMeal } from './meal-plan.js';
import { inputOf, makePlanQuest } from './plan-quests.js';
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

// Board n13 set out from the building of the Class that ended; since P05 ticket 42 an ended Class is never the asker's
// origin, so without a position it is unknown.
describe('Board n13: 배고파 without the location permission', () => {
  it('sets out from where nobody knows, though a Class ended five minutes ago, and offers 위치 켜기', async () => {
    const date = '2079-01-03';
    await lunchAt(date, '11:55');
    await stage.classAt(stage.asker, '11:00', '11:50', '301');
    await stage.classAt(stage.asker, '13:00', '13:50', '24');

    const response = await stage.send([planMeal(date), { text: '…' }], { context: { locationMissing: 'permission' } });

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.chips).toEqual([{ kind: 'until', text: '13:00 수업까지', userId: null }]);
    expect(answer.plans[0]?.parts[0]?.origin).toBeNull();
    expect(linesOf(answer.plans[0]?.lines)).not.toContain('301동에서 출발로 잡았어요');
    expect(answer.offers).toEqual([
      { kind: 'open', label: '위치 켜기', screen: 'location', hint: '위치를 켜면 지금 있는 곳에서 가까운 순으로 봐요' },
    ]);
  });

  it('sets out from where nobody knows long after the Class ended', async () => {
    const date = '2079-01-10';
    await lunchAt(date, '12:40');
    await stage.classAt(stage.asker, '09:00', '10:15', '301');
    await stage.classAt(stage.asker, '15:00', '16:15', '24');

    const response = await stage.send([planMeal(date), { text: '…' }], { context: { locationMissing: 'permission' } });

    const answer = answerIn(response.body);
    expect(answer.chips.map(({ kind }) => kind)).not.toContain('origin');
    expect(answer.plans[0]?.parts[0]?.origin).toBeNull();
  });
});

describe('A recalculation of board n13', () => {
  it('keeps no origin when it says the permission is missing', async () => {
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
    expect(answer.chips.map(({ kind }) => kind)).not.toContain('origin');
    expect(answer.offers).toEqual([
      { kind: 'open', label: '위치 켜기', screen: 'location', hint: '위치를 켜면 지금 있는 곳에서 가까운 순으로 봐요' },
    ]);
  });
});

describe('A Quest made from an answer of board n13 (review 2026-11-16)', () => {
  it('is made from the Plan the asker saw, with no origin for the asker', async () => {
    const date = '2079-02-07';
    await lunchAt(date, '12:40');
    await stage.classAt(stage.asker, '09:00', '10:15', '301');
    const friend = await stage.friend('민수');
    await stage.classAt(friend, '11:00', '12:40', '302');
    const input = inputOf(date, [stage.asker.id, friend.id]);
    const answered = await withAccessToken(
      request(stage.app.getHttpServer()).post('/assistant/answers'),
      stage.asker.accessToken,
    ).send({ input, location: null, locationMissing: 'permission' });
    const plan = z
      .custom<AnswerReply>()
      .parse(answered.body)
      .plans.find(({ id }) => id === '302동식당');
    expect(plan?.parts[0]).toMatchObject({ origin: null, walkMinutes: null });

    const response = await makePlanQuest(stage, {
      input,
      planId: '302동식당',
      startAt: plan?.startAt,
      location: null,
      locationMissing: 'permission',
    });

    expect(response.status).toBe(201);
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
    expect(linesOf(answer.plans[0]?.lines)).toEqual(['301동식당이 가장 가까워요', '오늘 제육볶음']);
    expect(answer.plans[0]?.basis[0]).toBe('시간표가 없어 가까운 순서로 넘겨 봐요');
    expect(answer.note).toBe('시간표를 넣으면 나설 시각까지 알려 드려요');
    expect(answer.offers).toEqual([
      { kind: 'open', label: '시간표 넣기', screen: 'timetable', hint: '시간표를 넣으면 나설 시각까지 알려 드려요' },
    ]);
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
