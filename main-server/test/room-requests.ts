/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { befriend, signInUser, type TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { patchProfile } from './profile.js';
import { connectToDatabase } from './quests.js';
import { withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The stage of the room requests: the app on a clock that stands at Wednesday 2026-11-04 10:05 in Korea, as the
// library tools' stage does. Requests are for Thursday 2026-11-05, so that only a file that moves the clock on that
// day expires them; every file asks as Users of its own.

export const NOW = new Date('2026-11-04T10:05:00+09:00');

// 그룹스터디룸 6인실 for 4 to 6 people, Thursday 15:00 for an hour.
export const ROOM_KEY = 'book:4F-group-6:2026-11-05:1500:60';

export const DECLINED = '파티 구성원이 제안을 거절했습니다';

export const PARTY_REFUSAL = '파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요';

const personSchema = z.strictObject({ userId: z.string(), name: z.string() });

export const roomRequestSchema = z.strictObject({
  id: z.string(),
  status: z.enum(['gathering', 'ready', 'booked', 'cancelled', 'dissolved', 'expired']),
  questId: z.string(),
  madeForBooking: z.boolean(),
  requester: personSchema,
  space: z.strictObject({ id: z.string(), name: z.string() }),
  date: z.string(),
  start: z.string(),
  minutes: z.number(),
  useDesc: z.string().nullable(),
  reason: z.string().nullable(),
  failed: personSchema.nullable(),
  consents: z.array(personSchema.extend({ consented: z.boolean().nullable() })),
});

export type RoomRequestBody = z.infer<typeof roomRequestSchema>;

export const inboxSchema = z.strictObject({
  asks: z.array(
    z.strictObject({
      requestId: z.string(),
      requester: personSchema,
      space: z.strictObject({ id: z.string(), name: z.string() }),
      date: z.string(),
      start: z.string(),
      minutes: z.number(),
      consented: z.boolean().nullable(),
      recheck: z.boolean(),
    }),
  ),
  notices: z.array(z.strictObject({ id: z.string(), requestId: z.string(), text: z.string() })),
});

export const companionsSchema = z.array(
  z.strictObject({ userId: z.string(), registeredName: z.string(), studentNumber: z.string().nullable() }),
);

export class RoomStage {
  app!: INestApplication<Server>;
  prisma!: PrismaClient;
  clock!: Clock;
  // Every reply body the stage received, to look for a 학번 in.
  readonly replies: string[] = [];

  async start(settings: Record<string, string | undefined>): Promise<void> {
    this.app = await startApp(settings, [], refuseKakao, refuseMatchServer);
    this.clock = this.app.get<Clock>(CLOCK);
    vi.spyOn(this.clock, 'now').mockReturnValue(NOW);
    this.prisma = connectToDatabase();
  }

  async stop(): Promise<void> {
    await this.prisma.$disconnect();
    await this.app.close();
  }

  // A User with a 학번 and a registered name in 내 정보, unless `details` is false.
  async user(name: string, studentNumber: string | null = null): Promise<TestUser> {
    const user = await signInUser(this.app, { name, department: '컴퓨터공학부' });
    if (studentNumber !== null) {
      await patchProfile(this.app, user.accessToken, { studentNumber, registeredName: `${name}학적` }).expect(200);
    }
    return user;
  }

  // The requester and their Friends, each with a 학번 that starts with the prefix.
  async party<const Names extends readonly string[]>(
    names: Names,
    prefix = '20269',
  ): Promise<{ [Index in keyof Names]: TestUser }> {
    const users: TestUser[] = [];
    for (const [index, name] of names.entries()) {
      // oxlint-disable-next-line no-await-in-loop -- the 학번 follow the order of the names
      users.push(await this.user(name, `${prefix}${String(index + 1).padStart(9 - prefix.length, '0')}`));
    }
    const [requester, ...friends] = users;
    for (const friend of friends) {
      // oxlint-disable-next-line no-await-in-loop -- one Friend Request at a time
      await befriend(this.app, requester ?? friend, friend);
    }
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- one User for each name, in their order
    return users as { [Index in keyof Names]: TestUser };
  }

  // The id of the one Quest invitation the User has.
  async invitationOf(user: TestUser): Promise<string> {
    const response = await withAccessToken(
      request(this.app.getHttpServer()).get('/quest-invitations'),
      user.accessToken,
    ).expect(200);
    const [only] = z
      .array(z.object({ id: z.string() }))
      .length(1)
      .parse(response.body);
    if (only === undefined) {
      throw new Error('No invitation');
    }
    return only.id;
  }

  private kept(call: request.Test): request.Test {
    return call.expect((response) => {
      this.replies.push(JSON.stringify(response.body));
    });
  }

  create(user: TestUser, body: object): request.Test {
    return this.kept(
      withAccessToken(request(this.app.getHttpServer()).post('/library/room-requests'), user.accessToken)
        .set('Idempotency-Key', randomUUID())
        .send(body),
    );
  }

  // A request of the requester's with these Friends, which answers its id.
  async made(requester: TestUser, friends: readonly TestUser[], key = ROOM_KEY): Promise<RoomRequestBody> {
    const response = await this.create(requester, { key, friendIds: friends.map(({ id }) => id) }).expect(201);
    return roomRequestSchema.parse(response.body);
  }

  // A request of the requester's that asks the other Holders of an existing Quest.
  async asking(requester: TestUser, questId: string): Promise<RoomRequestBody> {
    const response = await this.create(requester, { key: ROOM_KEY, questId }).expect(201);
    return roomRequestSchema.parse(response.body);
  }

  read(user: TestUser, id: string): request.Test {
    return this.kept(
      withAccessToken(request(this.app.getHttpServer()).get(`/library/room-requests/${id}`), user.accessToken),
    );
  }

  async status(user: TestUser, id: string): Promise<RoomRequestBody> {
    return roomRequestSchema.parse((await this.read(user, id).expect(200)).body);
  }

  inbox(user: TestUser): request.Test {
    return this.kept(
      withAccessToken(request(this.app.getHttpServer()).get('/library/room-requests'), user.accessToken),
    );
  }

  async notices(user: TestUser): Promise<string[]> {
    return inboxSchema.parse((await this.inbox(user).expect(200)).body).notices.map(({ text }) => text);
  }

  private post(user: TestUser, path: string, body?: object): request.Test {
    const call = withAccessToken(request(this.app.getHttpServer()).post(path), user.accessToken);
    return this.kept(body === undefined ? call : call.send(body));
  }

  consent(user: TestUser, id: string): request.Test {
    return this.post(user, `/library/room-requests/${id}/consent`);
  }

  decline(user: TestUser, id: string): request.Test {
    return this.post(user, `/library/room-requests/${id}/decline`);
  }

  result(user: TestUser, id: string, body: object): request.Test {
    return this.post(user, `/library/room-requests/${id}/result`, body);
  }

  cancelled(user: TestUser, id: string): request.Test {
    return this.post(user, `/library/room-requests/${id}/cancelled`);
  }

  // Not kept: the one reply that may hold a 학번.
  companions(user: TestUser, id: string): request.Test {
    return withAccessToken(
      request(this.app.getHttpServer()).get(`/library/room-requests/${id}/companions`),
      user.accessToken,
    );
  }

  // Each companion consents, which makes the request ready.
  async allConsent(id: string, companions: readonly TestUser[]): Promise<void> {
    for (const companion of companions) {
      // oxlint-disable-next-line no-await-in-loop -- one consent at a time
      await this.consent(companion, id).expect(200);
    }
  }

  // P04's day of a User, by the class this server registered, which startApp imports afresh.
  async itemNames(userId: string, date: string): Promise<string[]> {
    const { UserDayService } = await import('../src/assistant/free-time/user-day.service.js');
    const items = await this.app.get(UserDayService).itemsOn(userId, date);
    return items.map(({ name }) => name);
  }

  holderIds(questId: string): Promise<string[]> {
    return this.prisma.questHolder
      .findMany({ where: { questId }, select: { userId: true } })
      .then((holders) => holders.map(({ userId }) => userId));
  }
}

// An existing Quest the Users hold, such as a lunch 파티, led by the first, with a Sub Quest on the requests' day.
export async function lunchQuest(
  prisma: PrismaClient,
  [leaderId, ...others]: readonly [string, ...string[]],
): Promise<string> {
  const quest = await prisma.quest.create({
    data: {
      title: '점심 파티',
      leaderId,
      capacity: 8,
      holders: { create: [leaderId, ...others].map((userId) => ({ userId })) },
      subQuests: {
        create: {
          title: '점심',
          startsAt: new Date('2026-11-05T12:00:00+09:00'),
          endsAt: new Date('2026-11-05T13:00:00+09:00'),
        },
      },
    },
  });
  return quest.id;
}
