/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named } from './meal-plan.js';
import { withAccessToken } from './sign-in.js';

// The study answer together recalculated at POST /assistant/answers (P10 ticket 07), over the started server with the
// 관정 catalogue, the seed's Places and walking table: Friends added give one 관정관 plan at everyone's free time, whose
// key the room request takes; every Friend removed gives the answer alone again, or the answer together at three more
// when it stays together; and each answer needs the capability of the app that draws it. Nobody here has a Class, so
// everyone is free from now on.

const stage = new MealPlanStage();

beforeAll(() => stage.start({ ownDatabase: true }));

afterAll(() => stage.stop());

const BOTH = ['library', 'answer', 'study-plan', 'study-group'];

const answerIn = (body: unknown): AnswerReply => z.custom<AnswerReply>().parse(body);

function recalculate(input: object, clientCapabilities: string[] = BOTH): request.Test {
  return withAccessToken(request(stage.app.getHttpServer()).post('/assistant/answers'), stage.asker.accessToken).send({
    input,
    location: null,
    clientCapabilities,
  });
}

interface Asked {
  date: string;
  friends?: readonly { id: string }[];
  together?: boolean;
  window?: { from: string | null; until: string | null };
  seatSpaceId?: string | null;
}

const studyInput = ({ date, friends = [], together = true, window, seatSpaceId = null }: Asked): object => ({
  kind: 'study',
  date,
  what: 'any',
  people: [stage.asker.id, ...friends.map(({ id }) => id)].map((userId) => ({ userId, constraints: [] })),
  together,
  window: window ?? { from: null, until: null },
  area: null,
  minutes: null,
  chosen: { seatSpaceId, roomSpaceId: null },
});

const groupOf = (answer: AnswerReply): unknown => answer.plans[0]?.study?.group;

async function befriended(...names: string[]): Promise<Named[]> {
  const made: Named[] = [];
  for (const name of names) {
    // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time
    made.push(await stage.friend(name));
  }
  return made;
}

describe('A study input with three Friends', () => {
  it('is one 관정관 plan at everyone’s free time, whose key the room request takes with the Friends', async () => {
    const date = '2087-02-04';
    await stage.asking(date, '09:10');
    const three = await befriended('민수', '지은', '서준');

    const response = await recalculate(studyInput({ date, friends: three }));

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.plans.map(({ id, startAt, endAt }) => [id, startAt, endAt])).toEqual([
      ['관정관', `${date}T09:30:00+09:00`, `${date}T12:30:00+09:00`],
    ]);
    expect(groupOf(answer)).toMatchObject({
      room: { spaceId: '4F-group-6' },
      people: 4,
      moreNeeded: 0,
      key: `book:4F-group-6:${date}:0930:180`,
      request: null,
    });
    expect(answer.plans[0]?.band.lanes.map(({ name }) => name)).toEqual(['나', '민수', '지은', '서준']);
    expect(answer.chips.map(({ text }) => text)).toEqual(['민수', '지은', '서준']);

    const made = await withAccessToken(
      request(stage.app.getHttpServer()).post('/library/room-requests'),
      stage.asker.accessToken,
    )
      .set('Idempotency-Key', randomUUID())
      .send({ key: answer.plans[0]?.study?.group?.key, friendIds: three.map(({ id }) => id) });
    expect(made.status).toBe(201);
    expect(made.body).toMatchObject({ status: 'gathering', space: { id: '4F-group-6' }, start: '09:30', minutes: 180 });
  });

  it('lists the asker’s other Friends on the time card, with their walk to 관정관', async () => {
    const date = '2087-02-11';
    await stage.asking(date, '09:10');
    const [minsu, other] = await befriended('민수', '하람');

    const answer = answerIn(
      (await recalculate(studyInput({ date, friends: minsu === undefined ? [] : [minsu] }))).body,
    );

    expect(answer.plans[0]?.band.others?.map(({ userId }) => userId)).toEqual([other?.id]);
    expect(groupOf(answer)).toMatchObject({ people: 2, moreNeeded: 2, key: null });
  });
});

describe('Every Friend removed', () => {
  it('gives the answer alone with together false, the seat space and the window kept, and the Friends to add', async () => {
    const date = '2087-02-18';
    await stage.asking(date, '09:10');
    const [minsu] = await befriended('민수');
    const window = { from: '10:00', until: null };

    const response = await recalculate(studyInput({ date, together: false, window, seatSpaceId: '8F-8A-zone1-quiet' }));

    expect(response.status).toBe(200);
    const answer = answerIn(response.body);
    expect(answer.input).toMatchObject({ together: false, window, chosen: { seatSpaceId: '8F-8A-zone1-quiet' } });
    expect(answer.plans.length).toBeGreaterThan(1);
    expect(answer.plans.every(({ study }) => study?.group === undefined)).toBe(true);
    expect(answer.plans.find(({ id }) => id === '관정관')?.study?.book).toEqual({ spaceId: '8F-8A-zone1-quiet' });
    expect(answer.plans.every(({ band }) => band.others?.map(({ userId }) => userId).join() === minsu?.id)).toBe(true);
  });

  it('stays the answer together at three more while together is true', async () => {
    const date = '2087-02-25';
    await stage.asking(date, '09:10');

    const answer = answerIn((await recalculate(studyInput({ date }))).body);

    expect(answer.plans.map(({ id }) => id)).toEqual(['관정관']);
    expect(groupOf(answer)).toMatchObject({ room: { spaceId: '4F-group-6' }, people: 1, moreNeeded: 3, key: null });
  });
});

describe('The capability of the app', () => {
  it('is study-group for an input together and study-plan for one alone, else 422', async () => {
    const date = '2087-03-04';
    await stage.asking(date, '09:10');

    expect((await recalculate(studyInput({ date }), ['library', 'answer', 'study-plan'])).status).toBe(422);
    expect(
      (await recalculate(studyInput({ date, together: false }), ['library', 'answer', 'study-group'])).status,
    ).toBe(422);
    expect((await recalculate(studyInput({ date }), ['library', 'answer', 'study-group'])).status).toBe(200);
  });

  it('refuses with 400 someone who is not the asker’s Friend', async () => {
    const date = '2087-03-11';
    await stage.asking(date, '09:10');
    expect((await recalculate(studyInput({ date, friends: [{ id: randomUUID() }] }))).status).toBe(400);
  });
});
