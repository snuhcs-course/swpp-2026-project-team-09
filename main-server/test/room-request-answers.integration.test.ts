/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type AnswerReply } from '../src/assistant/dto/answer.dto.js';
import { STUDY_GROUP_GATHERING } from './fixtures/study-group-answers.js';
import { type TestUser } from './friends.js';
import { getQuest, getQuests } from './quests.js';
import { lunchQuest, ROOM_KEY, roomRequestSchema, RoomStage } from './room-requests.js';
import { withAccessToken } from './sign-in.js';

// A room request sent from a study answer (P10 ticket 08): the study input it keeps, the answer rebuilt from it at
// GET …/:id/answer for the requester alone, locked at the request's room and time with the request's state, and a
// booking party's consent count on the Quests. Requests are for Thursday 2026-11-05 15:00 for an hour (ROOM_KEY).

// Each test signs in four Users and befriends them over HTTP before it starts, as the other room request files do.
vi.setConfig({ testTimeout: 15_000 });

const stage = new RoomStage();

beforeAll(() => stage.start(inject('settings')));

afterAll(() => stage.stop());

const ids = (users: readonly TestUser[]): string[] => users.map(({ id }) => id);

// The requester and three Friends, named by the prefix.
function fourOf(prefix: string): Promise<readonly [TestUser, TestUser, TestUser, TestUser]> {
  return stage.party([`${prefix}부커`, `${prefix}민수`, `${prefix}지은`, `${prefix}하늘`] as const);
}

// The study input of the answer the request is sent from, as the app keeps it.
const studyInput = (people: readonly TestUser[]): object => ({
  kind: 'study',
  date: '2026-11-05',
  what: 'quiet',
  people: people.map(({ id }) => ({ userId: id, constraints: [] })),
  together: true,
  window: { from: '14:00', until: null },
  area: null,
  minutes: 60,
  chosen: { seatSpaceId: '7F-7A-zone2', roomSpaceId: null },
});

function answerOf(user: TestUser, id: string): request.Test {
  return withAccessToken(
    request(stage.app.getHttpServer()).get(`/library/room-requests/${id}/answer`),
    user.accessToken,
  );
}

async function answered(user: TestUser, id: string): Promise<AnswerReply> {
  return z.custom<AnswerReply>().parse((await answerOf(user, id).expect(200)).body);
}

const groupOf = (answer: AnswerReply): unknown => answer.plans[0]?.study?.group;

const requestOf = (user: TestUser, id: string): Promise<unknown> =>
  answered(user, id).then((answer) => answer.plans[0]?.study?.group?.request);

describe('A room request sent with its study input', () => {
  it('keeps the input, and answers it back locked at its room and time while it gathers', async () => {
    const people = await fourOf('답');
    const [booker, ...friends] = people;
    const input = studyInput(people);
    const response = await stage.create(booker, { key: ROOM_KEY, friendIds: ids(friends), input }).expect(201);
    const { id } = roomRequestSchema.parse(response.body);

    expect((await stage.prisma.roomRequest.findUniqueOrThrow({ where: { id } })).studyInput).toEqual(input);
    const answer = await answered(booker, id);

    expect(answer.plans.map(({ id: planId, startAt, endAt }) => [planId, startAt, endAt])).toEqual([
      ['관정관', '2026-11-05T15:00:00+09:00', '2026-11-05T16:00:00+09:00'],
    ]);
    expect(groupOf(answer)).toMatchObject({
      room: { spaceId: '4F-group-6' },
      rooms: [{ spaceId: '4F-group-6', fits: true }],
      people: 4,
      moreNeeded: 0,
      key: ROOM_KEY,
      request: {
        id,
        status: 'gathering',
        consented: 0,
        asked: 3,
        waiting: ['답민수', '답지은', '답하늘'],
        moreNeeded: 0,
      },
    });
    expect(answer.input).toMatchObject({
      what: 'quiet',
      window: { from: '14:00', until: null },
      minutes: 60,
      chosen: { seatSpaceId: '7F-7A-zone2', roomSpaceId: '4F-group-6' },
    });
    expect(answer.plans[0]?.parts.map(({ userId }) => userId)).toEqual(ids(people));
  });
});

describe('The rebuilt answer of a request sent with its study input', () => {
  it('is ready after the three consents, and booked after the result', async () => {
    const people = await fourOf('예');
    const [booker, ...friends] = people;
    const body = { key: ROOM_KEY, friendIds: ids(friends), input: studyInput(people) };
    const { id } = roomRequestSchema.parse((await stage.create(booker, body).expect(201)).body);
    await stage.consent(friends[1], id).expect(200);

    expect(await requestOf(booker, id)).toMatchObject({ consented: 1, asked: 3, waiting: ['예민수', '예하늘'] });

    await stage.allConsent(id, friends);

    expect(await requestOf(booker, id)).toEqual({
      id,
      status: 'ready',
      consented: 3,
      asked: 3,
      waiting: [],
      moreNeeded: 0,
    });

    await stage.result(booker, id, { ok: true }).expect(204);
    const booked = await answered(booker, id);

    expect(groupOf(booked)).toMatchObject({ people: 4, request: { status: 'booked', consented: 3, asked: 3 } });
  });
});

// The names of an object's fields, and of the fields of the objects in it, as paths: what the app's mock must match.
function fieldsOf(value: unknown, path = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [path];
  }
  return Object.entries(value).flatMap(([key, field]) => fieldsOf(field, `${path}.${key}`));
}

describe('The app’s mock of a rebuilt answer', () => {
  it('has the fields of the plan, its group and the request that the route gives', async () => {
    const people = await fourOf('목');
    const [booker, ...friends] = people;
    const body = { key: ROOM_KEY, friendIds: ids(friends), input: studyInput(people) };
    const { id } = roomRequestSchema.parse((await stage.create(booker, body).expect(201)).body);
    const [plan] = (await answered(booker, id)).plans;
    const [mock] = STUDY_GROUP_GATHERING.plans;

    expect(fieldsOf(plan?.study).toSorted()).toEqual(fieldsOf(mock?.study).toSorted());
    expect(Object.keys(plan ?? {}).toSorted()).toEqual(Object.keys(mock ?? {}).toSorted());
  });
});

describe('A room request from the chat’s book card, without an input', () => {
  it('is made as before, and still answers, without the companion who declined', async () => {
    const [booker, ...friends] = await fourOf('챗');
    const made = await stage.made(booker, friends);

    expect((await stage.prisma.roomRequest.findUniqueOrThrow({ where: { id: made.id } })).studyInput).toBeNull();

    await stage.decline(friends[0], made.id).expect(204);
    const answer = await answered(booker, made.id);

    expect(answer.input).toMatchObject({
      what: 'any',
      window: { from: null, until: null },
      minutes: 60,
      chosen: { seatSpaceId: null, roomSpaceId: '4F-group-6' },
    });
    expect(answer.plans[0]?.parts.map(({ userId }) => userId).toSorted()).toEqual(
      ids([booker, ...friends.slice(1)]).toSorted(),
    );
    expect(groupOf(answer)).toMatchObject({
      people: 3,
      moreNeeded: 1,
      request: { status: 'gathering', consented: 0, asked: 2, moreNeeded: 1 },
    });
  });

  it('answers for an existing Quest’s Holders who are not the requester’s Friends', async () => {
    const booker = await stage.user('홀부');
    const others = await Promise.all(['홀1', '홀2', '홀3'].map((name) => stage.user(name)));
    const questId = await lunchQuest(stage.prisma, [booker.id, ...ids(others)]);
    const { id } = await stage.asking(booker, questId);
    const answer = await answered(booker, id);

    expect(groupOf(answer)).toMatchObject({ people: 4, request: { status: 'gathering', asked: 3 } });
  });
});

describe('What the rebuilt answer refuses', () => {
  it('a companion and anyone else but the requester, and an input that is not a study input', async () => {
    const people = await fourOf('막');
    const [booker, friend] = people;
    const { id } = await stage.made(booker, people.slice(1));

    expect((await answerOf(friend, id).expect(403)).body).toMatchObject({ code: 'NOT_ROOM_REQUESTER' });

    await answerOf(await stage.user('막남'), id).expect(403);
    await answerOf(booker, '00000000-0000-4000-8000-000000000000').expect(404);
    const meal = { ...studyInput(people), kind: 'meal' };
    await stage.create(booker, { key: ROOM_KEY, friendIds: ids(people.slice(1)), input: meal }).expect(400);
  });
});

const questRoom = z.object({
  id: z.string(),
  roomRequest: z.object({ id: z.string(), status: z.string(), consented: z.number(), asked: z.number() }).nullable(),
});

describe('A booking party on the Quests', () => {
  it('gives its consent count, and every other Quest null', async () => {
    const [booker, ...friends] = await fourOf('퀘');
    const lunchId = await lunchQuest(stage.prisma, [booker.id, friends[0].id]);
    const made = await stage.made(booker, friends);
    const listed = z.array(questRoom).parse((await getQuests(stage.app, booker).expect(200)).body);

    expect(listed.find(({ id }) => id === made.questId)?.roomRequest).toEqual({
      id: made.id,
      status: 'gathering',
      consented: 0,
      asked: 3,
    });
    expect(listed.find(({ id }) => id === lunchId)?.roomRequest).toBeNull();

    await stage.consent(friends[0], made.id).expect(200);
    const read = questRoom.parse((await getQuest(stage.app, friends[0], made.questId).expect(200)).body);

    expect(read.roomRequest).toMatchObject({ status: 'gathering', consented: 1, asked: 3 });
  });

  it('a Quest whose Holders a request asks is no booking party', async () => {
    const [booker, ...friends] = await fourOf('점');
    const questId = await lunchQuest(stage.prisma, [booker.id, ...ids(friends)]);
    await stage.asking(booker, questId);
    const read = questRoom.parse((await getQuest(stage.app, booker, questId).expect(200)).body);

    expect(read.roomRequest).toBeNull();
  });
});

describe('The migration', () => {
  it('adds room_requests.study_input as a nullable jsonb column without a default', async () => {
    const columns = await stage.prisma.$queryRaw<{ data_type: string; is_nullable: string; column_default: null }[]>`
      SELECT data_type, is_nullable, column_default FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'room_requests' AND column_name = 'study_input'`;

    expect(columns).toEqual([{ data_type: 'jsonb', is_nullable: 'YES', column_default: null }]);
  });
});
