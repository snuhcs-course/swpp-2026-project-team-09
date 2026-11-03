/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { seedDemo } from '../src/demo/demo.seed.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { seedHe } from '../src/he/he.seed.js';
import { loadSeed } from '../src/load-seed.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { createDatabase } from './containers.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { postOnboarding, type SignInResult, signInResultSchema, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The stage of the HE seed's tests (P15): the HE data over the seed files and the demo data, read as the evaluators'
// apps read it when the evaluation starts, Wednesday 2026-11-04 15:30 in Korea. Every account has signed in by its key
// and finished Onboarding, as an evaluator would. The HE accounts' Google subjects are fixed, so each file's stage has
// a database of its own.

const NOW = new Date('2026-11-04T15:30:00+09:00');

// The demo refresh of that morning, after which the demo's band show is on Thursday at 19:00.
const DEMO_REFRESH = new Date('2026-11-04T04:00:00+09:00');

// The spec's accounts (.scratch/iteration-3/P15-he-preparation/spec.md, The HE accounts), each with its Friends in the
// order of the list.
export const ACCOUNTS = [
  { key: 'he-r1a', name: '김하늘', department: '컴퓨터공학부', friendId: 'HERA2345', friends: ['박서진', '오세린'] },
  { key: 'he-r1b', name: '최유나', department: '심리학과', friendId: 'HERB2345', friends: ['박서진', '오세린'] },
  { key: 'he-r2a', name: '한지우', department: '산업공학과', friendId: 'HERC2345', friends: ['박서진', '오세린'] },
  { key: 'he-r2b', name: '정민재', department: '경제학부', friendId: 'HERD2345', friends: ['오세린', '이도현'] },
  { key: 'he-s1', name: '이도현', department: '경영학과', friendId: 'HESA2345', friends: ['정민재'] },
  {
    key: 'he-s2',
    name: '박서진',
    department: '기계공학부',
    friendId: 'HESB2345',
    friends: ['김하늘', '최유나', '한지우'],
  },
  {
    key: 'he-s3',
    name: '오세린',
    department: '생명과학부',
    friendId: 'HESC2345',
    friends: ['김하늘', '정민재', '최유나', '한지우'],
  },
];

// What every evaluator answers in Onboarding beside the suggested name and department.
export const ADMISSION_YEAR = 2023;

const placesSchema = z.array(z.object({ id: z.string(), number: z.string().nullable() }));

export class HeStage {
  readonly model = new ScriptedModel();
  app!: INestApplication<Server>;
  prisma!: PrismaClient;
  // Each account's sign-in, by name.
  readonly signedIn = new Map<string, SignInResult>();
  private drop!: () => Promise<void>;

  // Everything the HE seed needs, without the HE data.
  async prepare(): Promise<void> {
    let url: string;
    ({ prisma: this.prisma, url, drop: this.drop } = await createDatabase(inject('settings').DATABASE_URL));
    await loadSeed(this.prisma);
    // Each account asks the Assistant more often than a User may in a day.
    const settings = { ...inject('settings'), DATABASE_URL: url, HE_ACCOUNTS: 'on', ASSISTANT_DAILY_MESSAGES: '1000' };
    this.app = await startApp(settings, [], refuseKakao, refuseMatchServer, this.model.model);
    vi.spyOn(this.app.get<Clock>(CLOCK), 'now').mockImplementation(() => NOW);
    // Imported after the app, so that it is the class the app registered.
    const { SignalsService } = await import('../src/common/signals.service.js');
    await seedDemo(this.prisma, this.app.get(SignalsService), DEMO_REFRESH);
  }

  async start(): Promise<void> {
    await this.prepare();
    await seedHe(this.prisma);
    await Promise.all(
      ACCOUNTS.map(async ({ key, name, department }) => {
        const response = await this.signIn(key);
        expect(response.status).toBe(200);
        const result = signInResultSchema.parse(response.body);
        this.signedIn.set(name, result);
        const answers = { name, department, admissionYear: ADMISSION_YEAR };
        expect((await postOnboarding(this.app, result.accessToken, answers)).status).toBe(204);
      }),
    );
  }

  async stop(): Promise<void> {
    await this.app.close();
    await this.drop();
  }

  signIn(key: string): request.Test {
    return request(this.app.getHttpServer()).post('/auth/google').send({ idToken: key });
  }

  rowCounts(): Promise<number[]> {
    const { prisma } = this;
    return Promise.all([
      prisma.user.count(),
      prisma.friendship.count(),
      prisma.timetableClass.count(),
      prisma.classTime.count(),
      prisma.quest.count(),
      prisma.questHolder.count(),
      prisma.subQuest.count(),
      prisma.questInvitation.count(),
      prisma.questJoinRequest.count(),
      prisma.partyMember.count(),
    ]);
  }

  tokenOf(name: string): string {
    return this.signedIn.get(name)?.accessToken ?? '';
  }

  get(path: string, name: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).get(path), this.tokenOf(name));
  }

  post(path: string, name: string): request.Test {
    return withAccessToken(request(this.app.getHttpServer()).post(path), this.tokenOf(name));
  }

  async bodyOf(path: string, name: string): Promise<unknown> {
    const response = await this.get(path, name);
    expect(response.status).toBe(200);
    return response.body;
  }

  // The campus map's number of each Place, by its id.
  async placeNumbers(): Promise<Map<string, string | null>> {
    const places = placesSchema.parse(await this.bodyOf('/places', '김하늘'));
    return new Map(places.map(({ id, number }) => [id, number]));
  }
}
