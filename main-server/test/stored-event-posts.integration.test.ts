/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-22  Opus 5.5   prompted by TaeHyun79
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { GlobalEventState, PrismaClient } from '../src/generated/prisma/client.js';
import { ownSession, postNumbersFrom } from './global-events.js';
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
// instead, it would change the events list's Collection status, which
// test/global-events.integration.test.ts checks.
async function store(postNumber: number, state: GlobalEventState): Promise<void> {
  await prisma.globalEvent.create({
    data: {
      title: '설명회',
      description: '',
      state,
      sessions: ownSession(postNumber),
    },
  });
}

describe("The worker's question about stored posts", () => {
  it('is answered with the posts stored, in any state and in the order asked, and not with an unknown one', async () => {
    const [draft, discarded, unknown] = [newPost(), newPost(), newPost()];
    await store(draft, 'draft');
    await store(discarded, 'discarded');
    const keys = [unknown, discarded, draft].map(String);

    await expect(askAsWorker(app, '/global-events/stored-posts', { source: 'snu_events', keys })).resolves.toEqual({
      keys: [String(discarded), String(draft)],
    });
  });

  it('is answered for the Source it names: the same key on another Source is another post', async () => {
    const draft = newPost();
    await store(draft, 'draft');

    await expect(
      askAsWorker(app, '/global-events/stored-posts', { source: 'extra_snu', keys: [String(draft)] }),
    ).resolves.toEqual({ keys: [] });
  });

  it('is refused when a key is not text', async () => {
    expect(await refusal(app, '/global-events/stored-posts', { source: 'snu_events', keys: [176525] })).toContain(
      'keys.0: ',
    );
  });

  it('is refused when it names no Source, or one without posts', async () => {
    expect(await refusal(app, '/global-events/stored-posts', { keys: [] })).toContain('source: ');
    expect(await refusal(app, '/global-events/stored-posts', { source: 'coop_menus', keys: [] })).toContain('source: ');
  });
});
