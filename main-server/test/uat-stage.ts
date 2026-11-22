/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type Letter, type Tester, UAT_ACCOUNT_LIST } from '../src/uat/uat-accounts.js';
import { cancelUatEvent, resetTester, setUpUat, uatStatus } from '../src/uat/uat.seed.js';
import { createDatabase } from './containers.js';
import { signInResultSchema, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// The stage of the UAT data's tests: every account's phone signed in before any preparation ran, as they are once the
// APK is installed, at the time of the session, Monday 2026-11-23 15:45 in Korea. The UAT accounts' Google subjects
// are fixed, so each file's stage has a database of its own.

export const NOW = new Date('2026-11-23T15:45:00+09:00');

function keyOf(letter: Letter): string {
  return UAT_ACCOUNT_LIST.find((account) => account.letter === letter)?.key ?? '';
}

export const inKorea = (time: string): string => new Date(`${time}:00+09:00`).toISOString();

const named = z.array(z.object({ name: z.string() }));
const titled = z.array(z.object({ title: z.string() }));
const recruiting = z.array(
  z.object({
    title: z.string(),
    leader: z.object({ name: z.string() }),
    holderCount: z.number(),
    capacity: z.number(),
    joinPolicy: z.string(),
    nextSubQuest: z.object({
      attending: z.boolean(),
      startsAt: z.string().nullable(),
      place: z.object({ placeId: z.string().nullable() }),
    }),
  }),
);

function collected(title: string, day: string): Prisma.GlobalEventCreateManyInput {
  return {
    title,
    description: '',
    startsAt: new Date(inKorea(`${day}T17:10`)),
    endsAt: new Date(inKorea(`${day}T18:10`)),
    state: 'published',
    publicationRoute: 'rule',
    place: '학생회관',
    latitude: 37.4594,
    longitude: 126.9506,
  };
}

export class UatStage {
  prisma!: PrismaClient;
  redis!: Redis;
  private app!: INestApplication<Server>;
  private drop!: () => Promise<void>;
  private readonly tokens = new Map<Letter, string>();

  async start(): Promise<void> {
    let url: string;
    ({ prisma: this.prisma, url, drop: this.drop } = await createDatabase(inject('settings').DATABASE_URL));
    await loadSeed(this.prisma);
    const settings = { ...inject('settings'), DATABASE_URL: url, HE_ACCOUNTS: 'on' };
    this.redis = new Redis({ host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) });
    this.app = await startApp(settings);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => NOW);
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    await Promise.all(UAT_ACCOUNT_LIST.map(({ letter }) => this.signIn(letter)));
    await this.writeCollectedEvents();
  }

  async stop(): Promise<void> {
    vi.useRealTimers();
    await this.app.close();
    this.redis.disconnect();
    await this.drop();
  }

  setUp(): Promise<string[]> {
    return setUpUat(this.prisma, this.redis, NOW);
  }

  reset(tester: Tester): Promise<string[]> {
    return resetTester(this.prisma, this.redis, tester, NOW);
  }

  cancel(): Promise<string[]> {
    return cancelUatEvent(this.prisma, this.redis);
  }

  status(): Promise<string[]> {
    return uatStatus(this.prisma, this.redis, NOW);
  }

  // The User's id of an account.
  async idOf(letter: Letter): Promise<string> {
    const { id } = await this.prisma.user.findUniqueOrThrow({
      where: { googleSubject: keyOf(letter) },
      select: { id: true },
    });
    return id;
  }

  async bodyOf(path: string, letter: Letter): Promise<unknown> {
    const response = await withAccessToken(request(this.app.getHttpServer()).get(path), this.tokens.get(letter) ?? '');
    expect(response.status).toBe(200);
    return response.body;
  }

  async friendsOf(letter: Letter): Promise<string[]> {
    return named
      .parse(await this.bodyOf('/friends', letter))
      .map(({ name }) => name)
      .toSorted();
  }

  // The recruiting posts an account reads, soonest first.
  async recruiting(letter: Letter, query = ''): Promise<z.infer<typeof recruiting>> {
    return recruiting
      .parse(await this.bodyOf(`/quests/recruiting${query}`, letter))
      .toSorted((a, b) => (a.nextSubQuest.startsAt ?? '').localeCompare(b.nextSubQuest.startsAt ?? ''));
  }

  // The titles of the events an account's list shows.
  async eventTitles(letter: Letter): Promise<string[]> {
    return titled
      .parse(await this.bodyOf('/global-events', letter))
      .map(({ title }) => title)
      .toSorted();
  }

  private async signIn(letter: Letter): Promise<void> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/google')
      .send({ idToken: keyOf(letter) });
    expect(response.status).toBe(200);
    this.tokens.set(letter, signInResultSchema.parse(response.body).accessToken);
  }

  // What a Collection published: one event today, which a preparation cancels, and one in three days, which it leaves.
  private async writeCollectedEvents(): Promise<void> {
    await this.prisma.globalEvent.createMany({
      data: [collected('수집 오늘', '2026-11-23'), collected('수집 사흘 뒤', '2026-11-26')],
    });
  }
}
