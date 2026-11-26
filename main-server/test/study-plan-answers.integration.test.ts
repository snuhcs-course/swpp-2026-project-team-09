/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// A study plan's input answered again at POST /assistant/answers from its own time (P10 ticket 03), over the started
// server with the seed's study spaces and hours: the buildings known open then first, then those whose hours are not
// known, and the ones closed then apart. The asker has no Class that day and sent no location, so every plan starts at
// the time asked.

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const DATE = '2087-01-07';

const answerIn = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

function recalculate(body: object): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send(
    body,
  );
}

const studyInput = (from: string | null, userId = stage.asker.id): object => ({
  kind: 'study',
  date: DATE,
  what: 'any',
  people: [{ userId, constraints: [] }],
  window: { from, until: null },
  area: null,
});

describe("A study plan's input", () => {
  beforeAll(async () => {
    await stage.asking(DATE, '11:50');
  });

  it('is answered from a new time with the same order: known open first, then not known', async () => {
    const response = await recalculate({ input: studyInput('23:30'), location: null });
    const answer = answerIn(response.body);
    const open = answer.plans.map(({ study }) => study?.spaces[0]?.open);

    expect(response.status).toBe(200);
    expect(answer.plans[0]?.id).toBe('중앙도서관');
    expect(open.slice(open.indexOf('unknown')).every((state) => state === 'unknown')).toBe(true);
    expect(answer.plans.every(({ startAt }) => startAt === `${DATE}T23:30:00+09:00`)).toBe(true);
    expect(answer.closed?.map(({ place }) => place.label)).toContain('관정관(62-1동)');
    expect(answer.choosable).toBe(true);
  });

  it('is refused with 400 when its person is not the asker', async () => {
    expect((await recalculate({ input: studyInput(null, randomUUID()), location: null })).status).toBe(400);
  });
});
