/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type StartedTestContainer } from 'testcontainers';
import { inject } from 'vitest';
import { type GlobalEvent, type PrismaClient, type Source } from '../src/generated/prisma/client.js';
import { connect, redisSettings, seededDatabase, startRedis, type SeededDatabase } from './containers.js';
import { eventsMessage, stepOver } from './global-events.js';
import { SignalWatcher } from './signals.js';
import { startApp } from './start-app.js';
import { sendAsWorker } from './worker.js';

// A server for a test file of Source Posts, on a database of its own, so that a post left before the step there is
// taken up by no other file's Collection, and a Redis of its own, so that no other file's signal reaches a check that
// none is sent.
export interface PostsWorld {
  settings: SeededDatabase<ReturnType<typeof inject<'settings'>>>['settings'];
  prisma: PrismaClient;
  app: INestApplication<Server>;
  watcher: SignalWatcher;
  stop: () => Promise<void>;
}

export async function startPostsWorld(): Promise<PostsWorld> {
  const redis: StartedTestContainer = await startRedis();
  const database = await seededDatabase({ ...inject('settings'), ...redisSettings(redis) });
  const prisma = connect(database.url);
  const [app, watcher] = await Promise.all([startApp(database.settings), SignalWatcher.start(database.settings)]);
  return {
    settings: database.settings,
    prisma,
    app,
    watcher,
    stop: async (): Promise<void> => {
      await prisma.$disconnect();
      await watcher.stop();
      await app.close();
      await database.drop();
      await redis.stop();
    },
  };
}

export function eventsOf(
  prisma: PrismaClient,
  key: string | number,
  source: Source = 'snu_events',
): Promise<GlobalEvent[]> {
  return prisma.globalEvent.findMany({
    where: { sessions: { some: { sourcePost: { source, key: String(key) } } } },
  });
}

export async function onlyEventOf(prisma: PrismaClient, key: number): Promise<GlobalEvent> {
  const [event] = await eventsOf(prisma, key);
  if (event === undefined) {
    throw new Error(`No event of post ${key}`);
  }
  return event;
}

export async function send(app: INestApplication<Server>, message: object): Promise<void> {
  await sendAsWorker(app, '/global-events/collected', message);
}

// Sends a message and waits for the step after its answer.
export async function collected(
  { app, prisma }: Pick<PostsWorld, 'app' | 'prisma'>,
  message: object,
  source: Source = 'snu_events',
): Promise<void> {
  await send(app, message);
  await stepOver(prisma, source);
}

// The step, held back as a restart between the answer and the step would leave it.
export async function holdingTheStep(app: INestApplication<Server>, act: () => Promise<void>): Promise<void> {
  // Imported after startApp, so that it is the same class AppModule registers.
  const { PublicationStepService } = await import('../src/global-events/publication-step.service.js');
  const held = vi.spyOn(app.get(PublicationStepService), 'run').mockResolvedValue();
  await act();
  await vi.waitFor(() => {
    expect(held).toHaveBeenCalled();
  });
  held.mockRestore();
}

// Takes up the posts a test left before the step, as the next Collection does.
export async function nextCollection(world: Pick<PostsWorld, 'app' | 'prisma'>): Promise<void> {
  await collected(world, eventsMessage([]));
}
