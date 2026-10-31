/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { once } from 'node:events';
import { Server } from 'node:http';
import { setTimeout } from 'node:timers/promises';
import request from 'supertest';
import { inject } from 'vitest';
import { type GlobalEvent, type PrismaClient } from '../src/generated/prisma/client.js';
import { changeState, patchGlobalEvent, type StateChange } from './global-event-changes.js';
import { publishedAmong } from './global-event-lists.js';
import { collectedPost, eventsMessage, postNumbersFrom } from './global-events.js';
import { type SignalWatcher, signalsWhile } from './signals.js';
import { signIn, signInAsAdministrator } from './sign-in.js';
import {
  collected,
  holdingTheStep,
  nextCollection,
  onlyEventOf,
  type PostsWorld,
  send,
  startPostsWorld,
} from './source-posts.js';
import { startApp } from './start-app.js';

let world: PostsWorld;
let prisma: PrismaClient;
let app: INestApplication<Server>;
let watcher: SignalWatcher;
let administrator: string;

beforeAll(async () => {
  world = await startPostsWorld();
  ({ prisma, app, watcher } = world);
  ({ accessToken: administrator } = await signInAsAdministrator(app));
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await world.stop();
});

const newPost = postNumbersFrom(970_000);

// A post, with `changes` applied, through the step.
async function collectedThroughTheStep(changes: Record<string, unknown> = {}): Promise<number> {
  const postNumber = newPost();
  await collected(world, eventsMessage([collectedPost(postNumber, changes)]));
  return postNumber;
}

// A post the rules read, stored and answered, and left before the step.
async function leftBeforeTheStep(): Promise<number> {
  const postNumber = newPost();
  await holdingTheStep(app, () => send(app, eventsMessage([collectedPost(postNumber)])));
  return postNumber;
}

function eventOf(postNumber: number): Promise<GlobalEvent> {
  return onlyEventOf(prisma, postNumber);
}

async function changed(postNumber: number, change: StateChange): Promise<GlobalEvent> {
  const { id, version } = await eventOf(postNumber);
  const response = await changeState(app, administrator, id, change, version);
  expect(response.status).toBe(200);
  return eventOf(postNumber);
}

async function edited(postNumber: number): Promise<GlobalEvent> {
  const { id, version } = await eventOf(postNumber);
  const response = await patchGlobalEvent(app, administrator, id, { version, title: '설명회 (수정)' });
  expect(response.status).toBe(200);
  return eventOf(postNumber);
}

describe('A Collection message', () => {
  it('is answered with every session a Draft and no route: nothing is published inside the request', async () => {
    const postNumber = await leftBeforeTheStep();
    const { accessToken } = await signIn(app);

    const event = await eventOf(postNumber);

    expect(event).toMatchObject({ state: 'draft', publicationRoute: null, version: 1 });
    expect(await publishedAmong(app, accessToken, [event.id])).toEqual([]);
    await nextCollection(world);
  });

  it('is answered while the step has not ended, and the step starts after it', async () => {
    const { PublicationStepService } = await import('../src/global-events/publication-step.service.js');
    const unending = new Promise<void>(() => {
      // Never resolved, as a long step would keep going.
    });
    const run = vi.spyOn(app.get(PublicationStepService), 'run').mockReturnValue(unending);

    await expect(send(app, eventsMessage([collectedPost(newPost())]))).resolves.toBeUndefined();

    await vi.waitFor(() => {
      expect(run).toHaveBeenCalledWith('snu_events');
    });
    run.mockRestore();
    await nextCollection(world);
  });
});

describe('The step after the answer', () => {
  it('publishes what the rules read with the route rule, at version 1, and tells the apps once', async () => {
    let postNumber = 0;

    const signals = await signalsWhile(app, watcher, 'global-events-changed', async () => {
      postNumber = await collectedThroughTheStep();
      await vi.waitFor(() => {
        expect(watcher.all().at(-1)?.name).toBe('global-events-changed');
      });
    });

    expect(signals).toEqual([{ name: 'global-events-changed' }]);
    expect(await eventOf(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'rule', version: 1 });
  });

  it('leaves a Draft what the rules did not read, without a route', async () => {
    const postNumber = await collectedThroughTheStep({ place: null });

    expect(await eventOf(postNumber)).toMatchObject({ state: 'draft', publicationRoute: null });
  });
});

describe('A post the step did not finish', () => {
  it('is taken up by the next Collection when a restart left it before the step', async () => {
    const postNumber = await leftBeforeTheStep();

    await nextCollection(world);

    expect(await eventOf(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'rule' });
  });

  it('is taken up by the next Collection when the step failed on it, and the step goes on with the others', async () => {
    const { PublicationStepService } = await import('../src/global-events/publication-step.service.js');
    const step = app.get(PublicationStepService);
    const failing = await leftBeforeTheStep();
    const { id: failingPost } = await prisma.sourcePost.findUniqueOrThrow({
      where: { source_key: { source: 'snu_events', key: String(failing) } },
    });
    const publishPost = step.publishPost.bind(step);
    vi.spyOn(step, 'publishPost').mockImplementation((sourcePostId) =>
      sourcePostId === failingPost ? Promise.reject(new Error('The database went away')) : publishPost(sourcePostId),
    );
    const other = newPost();

    await send(app, eventsMessage([collectedPost(other)]));
    await vi.waitFor(async () => {
      expect((await eventOf(other)).state).toBe('published');
    });
    expect((await eventOf(failing)).state).toBe('draft');

    vi.restoreAllMocks();
    await nextCollection(world);

    expect(await eventOf(failing)).toMatchObject({ state: 'published', publicationRoute: 'rule' });
  });
});

describe('A worker that gave up before the message was stored', () => {
  it('leaves the step to run all the same, once the message is stored', async () => {
    const { CollectedPostsService } = await import('../src/global-events/collected-posts.service.js');
    const collectedPosts = app.get(CollectedPostsService);
    const store = collectedPosts.store.bind(collectedPosts);
    const worker = new EventTarget();
    const storing = vi.spyOn(collectedPosts, 'store').mockImplementation(async (message) => {
      await once(worker, 'gone');
      return store(message);
    });
    const postNumber = newPost();

    const call = request(app.getHttpServer())
      .post('/global-events/collected')
      .auth(inject('settings').WORKER_TOKEN, { type: 'bearer' })
      .send(eventsMessage([collectedPost(postNumber)]));
    const answered = call.then(
      () => 'answered',
      () => 'gave up',
    );
    await vi.waitFor(() => {
      expect(storing).toHaveBeenCalled();
    });
    call.abort();
    // Long enough for the server to see the connection close.
    await setTimeout(100);
    worker.dispatchEvent(new Event('gone'));
    await answered;

    await vi.waitFor(async () => {
      expect(await eventOf(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'rule' });
    });
  });
});

describe('An Administrator acting before the step ran', () => {
  it('keeps a Draft they edited as a Draft', async () => {
    const postNumber = await leftBeforeTheStep();
    await edited(postNumber);

    await nextCollection(world);

    expect(await eventOf(postNumber)).toMatchObject({
      state: 'draft',
      title: '설명회 (수정)',
      publicationRoute: null,
    });
  });

  it('keeps an event they discarded discarded', async () => {
    const postNumber = await leftBeforeTheStep();
    await changed(postNumber, 'discard');

    await nextCollection(world);

    expect((await eventOf(postNumber)).state).toBe('discarded');
  });

  it('refuses a discard from the version a Draft had, once the step has published it', async () => {
    const postNumber = await leftBeforeTheStep();
    const { id, version } = await eventOf(postNumber);
    await nextCollection(world);

    const response = await changeState(app, administrator, id, 'discard', version);

    expect(response.body).toMatchObject({ statusCode: 409, code: 'GLOBAL_EVENT_STATE' });
    expect((await eventOf(postNumber)).state).toBe('published');
  });
});

describe('The Publication Route', () => {
  it('is administrator when an Administrator publishes a Draft, and stays when they cancel it', async () => {
    const postNumber = await collectedThroughTheStep({ readFrom: 'header' });

    expect(await changed(postNumber, 'publish')).toMatchObject({
      state: 'published',
      publicationRoute: 'administrator',
    });
    expect(await changed(postNumber, 'cancel')).toMatchObject({
      state: 'cancelled',
      publicationRoute: 'administrator',
    });
  });

  it('becomes administrator when an Administrator edits an event the rules published', async () => {
    const postNumber = await collectedThroughTheStep();

    expect(await edited(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'administrator' });
  });

  it('stays the rules when an Administrator cancels an event the rules published', async () => {
    const postNumber = await collectedThroughTheStep();

    expect(await changed(postNumber, 'cancel')).toMatchObject({ state: 'cancelled', publicationRoute: 'rule' });
  });

  it('stays empty when an Administrator edits a Draft', async () => {
    const postNumber = await collectedThroughTheStep({ place: null });

    expect(await edited(postNumber)).toMatchObject({ state: 'draft', publicationRoute: null });
  });
});

describe('With automatic publication off', () => {
  let off: INestApplication<Server>;

  beforeAll(async () => {
    off = await startApp({ ...world.settings, AUTOMATIC_PUBLICATION: 'off' });
  });

  afterAll(async () => {
    await off.close();
  });

  it('the step publishes nothing and tells no app, and every session stays a Draft', async () => {
    const postNumber = newPost();

    const signals = await signalsWhile(off, watcher, 'global-events-changed', () =>
      collected({ app: off, prisma }, eventsMessage([collectedPost(postNumber)])),
    );

    expect(signals).toEqual([]);
    expect(await eventOf(postNumber)).toMatchObject({ state: 'draft', publicationRoute: null, version: 1 });
  });

  it('an Administrator still publishes', async () => {
    const postNumber = newPost();
    await collected({ app: off, prisma }, eventsMessage([collectedPost(postNumber)]));

    expect(await changed(postNumber, 'publish')).toMatchObject({
      state: 'published',
      publicationRoute: 'administrator',
    });
  });
});
