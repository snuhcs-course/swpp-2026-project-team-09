/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { InterestsStage } from './interests.js';

// Keeping, listing, and removing watched interests through the routes, with a stand-in for the model.

const stage = new InterestsStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const interestSchema = z.strictObject({
  id: z.uuid(),
  words: z.string(),
  topics: z.array(z.string()),
  createdAt: z.iso.datetime(),
});

describe('POST /interests', () => {
  it('keeps the words with the topics read from them, and lists the newest first', async () => {
    const user = await stage.user();

    const first = await stage.watch(user, '채용 관련 행사');
    const second = await stage.watch(user, '배드민턴');

    expect(first.status).toBe(201);
    expect(interestSchema.parse(first.body)).toMatchObject({ words: '채용 관련 행사', topics: ['채용'] });
    const listed = z.array(interestSchema).parse((await stage.get(user, '/interests')).body);
    expect(listed.map(({ words }) => words)).toEqual(['배드민턴', '채용 관련 행사']);
    expect(listed[1]).toEqual(first.body);
    expect(second.status).toBe(201);
  });

  it('keeps the words as one topic when the model gives none', async () => {
    stage.topics.answer('#고장 난 말', 'fail');
    const user = await stage.user();

    const response = await stage.watch(user, '#고장 난 말');

    expect(response.body).toMatchObject({ words: '#고장 난 말', topics: ['고장난말'] });
  });

  it('keeps nothing new for the same words, written another way', async () => {
    const user = await stage.user();
    const kept = await stage.watch(user, '채용 관련 행사');

    const again = await stage.watch(user, '채용관련 행사');

    expect(again.body).toEqual(kept.body);
    expect((await stage.get(user, '/interests')).body).toHaveLength(1);
  });
});

describe('POST /interests refusing', () => {
  it('refuses a 21st with 409 INTERESTS_FULL', async () => {
    const user = await stage.user();
    const kept = await Promise.all(
      Array.from({ length: 20 }, (_, index) => stage.watch(user, `관심사 ${String(index + 1)}`)),
    );
    expect(kept.map(({ status }) => status)).toEqual(Array.from({ length: 20 }, () => 201));

    const response = await stage.watch(user, '관심사 21');

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: 'INTERESTS_FULL' });
  });

  it.each([
    ['empty words', ''],
    ['61 characters', '가'.repeat(61)],
  ])('refuses %s with 400', async (_, words) => {
    expect((await stage.watch(await stage.user(), words)).status).toBe(400);
  });

  it('answers 401 without a sign-in', async () => {
    expect((await request(stage.app.getHttpServer()).get('/interests')).status).toBe(401);
  });
});

describe('DELETE /interests/:id', () => {
  it("removes the User's interest, and answers 404 for another User's or a missing one", async () => {
    const [user, other] = [await stage.user(), await stage.user()];
    const { id } = interestSchema.parse((await stage.watch(user, '배드민턴')).body);

    expect((await stage.remove(other, id)).status).toBe(404);
    expect((await stage.remove(user, id)).status).toBe(204);
    expect((await stage.remove(user, id)).status).toBe(404);
    expect((await stage.remove(user, randomUUID())).status).toBe(404);
    expect((await stage.get(user, '/interests')).body).toEqual([]);
  });
});
