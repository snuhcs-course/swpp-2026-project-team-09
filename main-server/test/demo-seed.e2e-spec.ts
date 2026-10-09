// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type DemoSignals, prepareDemoAccounts, seedDemo } from '../src/demo/demo.seed.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { createDatabase } from './containers.js';
import { signIn, signInBeforeOnboarding } from './sign-in.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';

// The demo Users would show in every list of Users that other test files read, so the seed runs in a database of its own.
let prisma: PrismaClient;
let drop: () => Promise<void>;
let app: INestApplication<Server>;
let signals: DemoSignals;

const ACCOUNT_EMAIL = 'demo-tester@snu.ac.kr';

function rowCounts(): Promise<number[]> {
  return Promise.all([
    prisma.user.count(),
    prisma.session.count(),
    prisma.friendship.count(),
    prisma.globalEvent.count(),
    prisma.quest.count(),
    prisma.questHolder.count(),
    prisma.subQuest.count(),
    prisma.party.count(),
    prisma.partyMember.count(),
    prisma.questInvitation.count(),
    prisma.meetup.count(),
  ]);
}

function get(path: string, accessToken: string): request.Test {
  return request(app.getHttpServer()).get(path).auth(accessToken, { type: 'bearer' });
}

const senders = z.object({ received: z.array(z.object({ sender: z.object({ name: z.string() }) })) });
const meetups = z.object({ received: z.array(z.object({ state: z.string() })) });
const parties = z.array(z.object({ title: z.string(), joinPolicy: z.string(), memberCount: z.number() }));

// What the account reads of its share, as the app reads it.
async function shareOf(accessToken: string): Promise<object> {
  const [friends, requests, invitations, meetupList, partyList] = await Promise.all(
    ['/friends', '/friend-requests', '/quest-invitations', '/meetups', '/parties'].map(
      async (path) => (await get(path, accessToken)).body as unknown,
    ),
  );
  return {
    friends: z
      .array(z.object({ name: z.string() }))
      .parse(friends)
      .map(({ name }) => name)
      .toSorted(),
    requestsFrom: senders
      .parse(requests)
      .received.map(({ sender }) => sender.name)
      .toSorted(),
    invitations: z.array(z.unknown()).parse(invitations).length,
    meetups: meetups.parse(meetupList).received.map(({ state }) => state),
    parties: parties.parse(partyList),
  };
}

beforeAll(async () => {
  let url: string;
  ({ prisma, url, drop } = await createDatabase(inject('settings').DATABASE_URL));
  await loadSeed(prisma);
  app = await startApp({ ...inject('settings'), DATABASE_URL: url });
  const { SignalsService } = await import('../src/common/signals.service.js');
  signals = app.get(SignalsService);
});

afterAll(async () => {
  await app.close();
  await drop();
});

it('leaves the same rows when the demo seed runs again', async () => {
  await seedDemo(prisma, signals);
  const once = await rowCounts();
  await seedDemo(prisma, signals, new Date(Date.now() + 60_000));

  expect(await rowCounts()).toStrictEqual(once);
  expect(once.slice(0, 9)).toStrictEqual([8, 8, 8, 6, 8, 12, 11, 1, 2]);
});

it('gives an onboarded account named in the list its Friends, requests, invitation and Meetup, once', async () => {
  await seedDemo(prisma, signals);
  const { accessToken } = await signIn(app, { email: ACCOUNT_EMAIL });
  await signInBeforeOnboarding(app, { email: 'not-yet@snu.ac.kr' });
  const watcher = await SignalWatcher.start();

  const prepared = await prepareDemoAccounts(prisma, ['Demo-Tester@SNU.ac.kr', 'not-yet@snu.ac.kr'], signals);
  const counts = await rowCounts();
  await prepareDemoAccounts(prisma, [ACCOUNT_EMAIL], signals);

  expect(prepared).toHaveLength(1);
  expect(await rowCounts()).toStrictEqual(counts);
  expect(await shareOf(accessToken)).toStrictEqual({
    friends: ['김민준', '박지호', '이서연', '정예준', '최수아'],
    requestsFrom: ['강하은', '윤도윤'],
    invitations: 1,
    meetups: ['proposed'],
    parties: [{ title: '중도 스터디 중', joinPolicy: 'open', memberCount: 2 }],
  });
  await vi.waitFor(() => {
    expect(watcher.for({ id: prepared[0] ?? '' }).map(({ name }) => name)).toStrictEqual(
      expect.arrayContaining(['friends-changed', 'quests-changed', 'meetups-changed', 'party-changed']),
    );
  });
  await watcher.stop();
});

it('serves the Global Events and the recruiting Quests of every Board as the app reads them', async () => {
  await seedDemo(prisma, signals);
  const { accessToken } = await signIn(app, { email: 'reader@snu.ac.kr' });

  expect((await get('/global-events', accessToken)).body).toHaveLength(6);
  const boards = await Promise.all(
    ['meal', 'career', 'hobby', 'show'].map(async (board) =>
      z
        .array(z.object({ joinPolicy: z.string(), nextSubQuest: z.object({ place: z.unknown() }) }))
        .parse((await get(`/quests/recruiting?board=${board}`, accessToken)).body),
    ),
  );
  for (const quests of boards) {
    expect(quests.map(({ joinPolicy }) => joinPolicy).toSorted()).toStrictEqual(['approval', 'open']);
    expect(quests.every(({ nextSubQuest }) => nextSubQuest.place !== null)).toBe(true);
  }
});
