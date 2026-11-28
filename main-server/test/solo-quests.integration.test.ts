/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { befriend, signInUser } from './friends.js';
import { invite } from './quest-recruiting.js';
import { getQuest, getQuests, makeQuest, place132 } from './quests.js';
import { withAccessToken } from './sign-in.js';
import request from 'supertest';
import { type TestUser } from './friends.js';
import { startApp } from './start-app.js';

// A Quest of one's own made with nobody invited, taken alone (P05 ticket 87): the user's rule of 2026-11-28, a 비공개
// 파티 with nobody in it is a Quest of one's own, used as a to-do ("결국 퀘스트인데 혼자 하는 todo처럼 쓸 수도 있으니"),
// and his decision of 2026-11-16 that what one takes alone is a Quest. POST /quests/own made it a 파티 of four the User
// alone held. Partitions: made alone, with a capacity of 1 or none; refused with a board, Open or Approval, or a capacity
// of more than one; its place in the User's Quests; an invitation or a change of settings later.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

const subQuest = {
  title: '과제 제출',
  startsAt: '2030-10-13T09:00:00.000Z',
  endsAt: '2030-10-13T10:00:00.000Z',
  place: { label: '자하연 앞', ...place132 },
};

const alone = { title: '운영체제 과제', subQuest, takenAlone: true };

const idOf = (body: unknown): string => z.object({ id: z.string() }).parse(body).id;

function patchQuest(server: INestApplication<Server>, user: TestUser, id: string, body: object): request.Test {
  return withAccessToken(request(server.getHttpServer()).patch(`/quests/${id}`), user.accessToken).send(body);
}

describe('A Quest of one’s own made alone', () => {
  it.each([
    ['with no capacity', {}],
    ['with a capacity of 1', { capacity: 1 }],
    ['said Closed', { joinPolicy: 'closed' }],
  ])('is taken alone, Closed, for one, %s', async (_case, more) => {
    const user = await signInUser(app, { name: '김철수', department: '경영학과' });

    const response = await makeQuest(app, user, { ...alone, ...more });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      takenAlone: true,
      seatStay: false,
      capacity: 1,
      joinPolicy: 'closed',
      board: null,
    });
  });

  it('is among the User’s Quests, marked taken alone, as the app draws a Quest of one’s own', async () => {
    const user = await signInUser(app, { name: '이영희', department: '컴퓨터공학부' });
    const made = await makeQuest(app, user, alone);

    const quests = z
      .array(z.object({ id: z.string(), takenAlone: z.boolean() }))
      .parse((await getQuests(app, user)).body);

    expect(quests.find(({ id }) => id === idOf(made.body))).toMatchObject({ takenAlone: true });
  });

  it('is a 파티 of four, as before, when takenAlone is left out', async () => {
    const user = await signInUser(app, { name: '박지민', department: '경제학부' });

    const response = await makeQuest(app, user, { title: '저녁 같이', subQuest });

    expect(response.body).toMatchObject({ takenAlone: false, capacity: 4 });
  });
});

describe('A Quest of one’s own asked alone with what a 파티 has', () => {
  it.each([
    ['a board', { board: 'meal', joinPolicy: 'open' }, 'board'],
    ['Open', { joinPolicy: 'open', board: 'meal' }, 'board'],
    ['Approval', { joinPolicy: 'approval', board: 'hobby' }, 'board'],
    ['a capacity of 4', { capacity: 4 }, 'capacity'],
  ])('is refused with %s', async (_case, more, field) => {
    const user = await signInUser(app, { name: '최민수', department: '물리학과' });

    const response = await makeQuest(app, user, { ...alone, ...more });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain(field);
  });
});

// The user's rule of 2026-11-28 ("초대할 수 있지 왜 없어"): a Quest taken alone gathers by a later invitation through
// its room, but a seat's stay (in seat-stays). Partitions: an invitation, a change of settings, a title alone.
describe('A Quest of one’s own made alone, a Friend invited later', () => {
  it('gathers: no longer taken alone, a 파티 of four, the invitation sent', async () => {
    const user = await signInUser(app, { name: '정하은', department: '수학과' });
    const friend = await signInUser(app, { name: '한지우', department: '화학부' });
    await befriend(app, user, friend);
    const id = idOf((await makeQuest(app, user, alone)).body);

    const invited = await invite(app, user, id, friend.id);

    expect(invited.status).toBe(204);
    expect((await getQuest(app, user, id)).body).toMatchObject({
      takenAlone: false,
      capacity: 4,
      joinPolicy: 'closed',
    });
  });

  it('gathers by a change of its settings to more than one, and stays alone for a change of its title', async () => {
    const user = await signInUser(app, { name: '오세훈', department: '건축학과' });
    const id = idOf((await makeQuest(app, user, alone)).body);

    const titled = await patchQuest(app, user, id, { title: '과제 다시' });
    expect(titled.status).toBe(200);
    expect(titled.body).toMatchObject({ title: '과제 다시', takenAlone: true, capacity: 1 });

    const resized = await patchQuest(app, user, id, { capacity: 3 });
    expect(resized.status).toBe(200);
    expect(resized.body).toMatchObject({ takenAlone: false, capacity: 3 });
  });
});
