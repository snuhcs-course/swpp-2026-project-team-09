// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by TaeHyun79 and fyoon46 in #41 #45 #74
import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { GlobalEvent, Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { TestUser } from './friends.js';
import { withAccessToken } from './sign-in.js';

// The tests store Global Events with a connection of their own, in any state and without the signals of the
// Administrator's routes.
export function connectToDatabase(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
}

// 뉴미디어통신공동연구소, 132동, on the campus map.
export const place132 = { latitude: 37.45487, longitude: 126.95407 };

// A published Global Event in 132동 a day from now, with `changes` applied.
export function storeEvent(
  prisma: PrismaClient,
  changes: Partial<Prisma.GlobalEventCreateInput> = {},
): Promise<GlobalEvent> {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return prisma.globalEvent.create({
    data: {
      title: '지능형통신 연합전공 설명회',
      description: '',
      startsAt,
      endsAt: new Date(startsAt.getTime() + 2 * 60 * 60 * 1000),
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...place132,
      state: 'published',
      ...changes,
    },
  });
}

export function attend(
  app: INestApplication<Server>,
  user: TestUser,
  globalEventId: string,
  body: object = {},
): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/quests'), user.accessToken).send({
    globalEventId,
    ...body,
  });
}

export function makeQuest(
  app: INestApplication<Server>,
  user: TestUser,
  body: object,
  key: string | null = randomUUID(),
): request.Test {
  const call = withAccessToken(request(app.getHttpServer()).post('/quests/own'), user.accessToken).send(body);
  return key === null ? call : call.set('Idempotency-Key', key);
}

// Makes a Quest of the User's own with one Sub Quest a day from now, and `body` over that, and answers its id. An Open
// or an Approval Quest is posted on the board `hobby` unless `body` names one.
export async function ownQuest(app: INestApplication<Server>, user: TestUser, body: object = {}): Promise<string> {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const recruiting = 'joinPolicy' in body && (body.joinPolicy === 'open' || body.joinPolicy === 'approval');
  const response = await makeQuest(app, user, {
    title: '저녁 같이 먹어요',
    subQuest: { title: '저녁', startsAt },
    ...(recruiting ? { board: 'hobby' } : {}),
    ...body,
  });
  if (response.status !== 201) {
    throw new Error(`Making a Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

export function getRecruitingQuests(
  app: INestApplication<Server>,
  user: TestUser,
  globalEventId?: string,
  board?: string,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/quests/recruiting'), user.accessToken).query({
    ...(globalEventId === undefined ? {} : { globalEventId }),
    ...(board === undefined ? {} : { board }),
  });
}

export function joinQuest(app: INestApplication<Server>, user: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post(`/quests/${questId}/join`), user.accessToken);
}

export function getQuests(app: INestApplication<Server>, user: TestUser): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/quests'), user.accessToken);
}

export function getQuest(app: INestApplication<Server>, user: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).get(`/quests/${questId}`), user.accessToken);
}

export function dropQuest(app: INestApplication<Server>, user: TestUser, questId: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).delete(`/quests/${questId}`), user.accessToken);
}

export function addSubQuest(
  app: INestApplication<Server>,
  user: TestUser,
  questId: string,
  content: object,
  key: string | null = randomUUID(),
): request.Test {
  const call = withAccessToken(
    request(app.getHttpServer()).post(`/quests/${questId}/sub-quests`),
    user.accessToken,
  ).send(content);
  return key === null ? call : call.set('Idempotency-Key', key);
}

export function editSubQuest(
  app: INestApplication<Server>,
  user: TestUser,
  path: SubQuestPath,
  content: object,
): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).put(`/quests/${path.questId}/sub-quests/${path.subQuestId}`),
    user.accessToken,
  ).send(content);
}

export function cancelSubQuest(app: INestApplication<Server>, user: TestUser, path: SubQuestPath): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).delete(`/quests/${path.questId}/sub-quests/${path.subQuestId}`),
    user.accessToken,
  );
}

export function markDone(app: INestApplication<Server>, user: TestUser, path: SubQuestPath): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).post(`/quests/${path.questId}/sub-quests/${path.subQuestId}/done`),
    user.accessToken,
  );
}

export function unmarkDone(app: INestApplication<Server>, user: TestUser, path: SubQuestPath): request.Test {
  return withAccessToken(
    request(app.getHttpServer()).delete(`/quests/${path.questId}/sub-quests/${path.subQuestId}/done`),
    user.accessToken,
  );
}

export interface SubQuestPath {
  questId: string;
  subQuestId: string;
}

const questSchema = z.object({
  id: z.string(),
  subQuests: z.array(z.object({ id: z.string(), attending: z.boolean() })),
});

// Attends the Global Event and answers the Quest's id and its attending Sub Quest's.
export async function questFor(
  app: INestApplication<Server>,
  user: TestUser,
  globalEventId: string,
): Promise<{ questId: string; attendingId: string }> {
  const response = await attend(app, user, globalEventId);
  if (response.status !== 201) {
    throw new Error(`Attending answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  const { id, subQuests } = questSchema.parse(response.body);
  const attending = subQuests.find((subQuest) => subQuest.attending);
  if (attending === undefined) {
    throw new Error('The Quest has no attending Sub Quest');
  }
  return { questId: id, attendingId: attending.id };
}

// Adds a Sub Quest and answers its id.
export async function subQuestIn(
  app: INestApplication<Server>,
  user: TestUser,
  questId: string,
  content?: object,
): Promise<string> {
  const response = await addSubQuest(app, user, questId, content ?? { title: '카페' });
  if (response.status !== 201) {
    throw new Error(`Adding a Sub Quest answered ${response.status}: ${JSON.stringify(response.body)}`);
  }
  return z.object({ id: z.string() }).parse(response.body).id;
}

// A Quest for the Global Event held by these Users, led by the first. The tests store it with a connection of their own.
export async function storeSharedQuest(
  prisma: PrismaClient,
  globalEvent: Pick<GlobalEvent, 'id' | 'title'>,
  [leaderId, ...others]: readonly [string, ...string[]],
): Promise<string> {
  const holderIds = [leaderId, ...others];
  const quest = await prisma.quest.create({
    data: {
      title: globalEvent.title,
      globalEventId: globalEvent.id,
      leaderId,
      holders: { create: holderIds.map((userId) => ({ userId, globalEventId: globalEvent.id })) },
      subQuests: { create: { attending: true } },
    },
  });
  return quest.id;
}
