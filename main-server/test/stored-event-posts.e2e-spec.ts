// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #30
import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { GlobalEventState, PrismaClient } from '../src/generated/prisma/client.js';
import { postNumbersFrom } from './global-events.js';
import { startApp } from './start-app.js';
import { askAsWorker, refusal } from './worker.js';

let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const newPost = postNumbersFrom(910_000);

// Stores a post as an earlier Collection, or an Administrator after it, left it. Posted to `/global-events/collected`
// instead, it would change the events list's Collection status, which test/global-events.e2e-spec.ts checks.
async function store(postNumber: number, state: GlobalEventState): Promise<void> {
  await prisma.globalEvent.create({
    data: {
      title: '설명회',
      description: '',
      state,
      postNumber,
      sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    },
  });
}

describe("The worker's question about stored posts", () => {
  it('is answered with the posts stored, in any state and in the order asked, and not with an unknown one', async () => {
    const [draft, discarded, unknown] = [newPost(), newPost(), newPost()];
    await store(draft, 'draft');
    await store(discarded, 'discarded');

    await expect(
      askAsWorker(app, '/global-events/stored-posts', { postNumbers: [unknown, discarded, draft] }),
    ).resolves.toEqual({ postNumbers: [discarded, draft] });
  });

  it('is refused when a post number is not a number', async () => {
    expect(await refusal(app, '/global-events/stored-posts', { postNumbers: ['176525'] })).toContain('postNumbers.0: ');
  });
});
