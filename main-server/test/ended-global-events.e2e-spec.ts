// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { listedAmong, publishedAmong } from './global-event-lists.js';
import { connectToDatabase, storeEvent } from './quests.js';
import { signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;
let userToken: string;
let administratorToken: string;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = connectToDatabase();
  ({ accessToken: userToken } = await signIn(app));
  ({ accessToken: administratorToken } = await signInAsAdministrator(app));
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const HOUR_MS = 60 * 60 * 1000;

// 00:00 of today in Asia/Seoul, which keeps +09:00 all year.
function startOfTodayInSeoul(): Date {
  const today = new Date(Date.now() + 9 * HOUR_MS).toISOString().slice(0, 10);
  return new Date(`${today}T00:00:00+09:00`);
}

const ago = (ms: number): Date => new Date(Date.now() - ms);

const cases: ['shows' | 'leaves out', string, () => object][] = [
  [
    'leaves out',
    'an event whose end passed yesterday',
    () => ({ startsAt: ago(26 * HOUR_MS), endsAt: ago(24 * HOUR_MS) }),
  ],
  ['shows', 'an event whose end has not passed', () => ({ startsAt: ago(24 * HOUR_MS), endsAt: ago(-HOUR_MS) })],
  ['shows', 'an event without an end that started today', () => ({ startsAt: startOfTodayInSeoul(), endsAt: null })],
  [
    'leaves out',
    'an event without an end that started yesterday',
    () => ({ startsAt: new Date(startOfTodayInSeoul().getTime() - 60_000), endsAt: null }),
  ],
];

// The same rule decides both lists of published events.
describe.each([
  ["A User's list of Global Events", (id: string): Promise<unknown[]> => publishedAmong(app, userToken, [id])],
  [
    "An Administrator's list of published events",
    (id: string): Promise<unknown[]> => listedAmong(app, administratorToken, 'published', [id]),
  ],
])('%s', (_list, listed: (id: string) => Promise<unknown[]>) => {
  it.each(cases)('%s %s', async (outcome, _case, times) => {
    const event = await storeEvent(prisma, times());

    expect((await listed(event.id)).length).toBe(outcome === 'shows' ? 1 : 0);
  });
});
