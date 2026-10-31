/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { eventDetailSchema, getAdminGlobalEvent, publishedEventSchema } from './global-event-lists.js';
import { collectedPost, eventsMessage, postAddress, postNumbersFrom, stepOver } from './global-events.js';
import { signIn, signInAsAdministrator } from './sign-in.js';
import { collected, eventsOf, onlyEventOf, type PostsWorld, send, startPostsWorld } from './source-posts.js';
import { askAsWorker } from './worker.js';

let world: PostsWorld;
let prisma: PrismaClient;
let app: INestApplication<Server>;

beforeAll(async () => {
  world = await startPostsWorld();
  ({ prisma, app } = world);
});

afterAll(async () => {
  await world.stop();
});

const newPost = postNumbersFrom(960_000);

async function discard(key: number): Promise<number> {
  const { accessToken } = await signInAsAdministrator(app);
  const { id, version } = await onlyEventOf(prisma, key);
  const response = await request(app.getHttpServer())
    .post(`/admin/global-events/${id}/discard`)
    .auth(accessToken, { type: 'bearer' })
    .send({ version });
  return response.status;
}

describe('A collected post', () => {
  it('is stored once as a Source Post with its Source, key and address, its session linked to its event', async () => {
    const postNumber = newPost();

    await collected({ app, prisma }, eventsMessage([collectedPost(postNumber)]));

    const [event] = await eventsOf(prisma, postNumber);
    expect(
      await prisma.sourcePost.findUnique({
        where: { source_key: { source: 'snu_events', key: String(postNumber) } },
        include: { sessions: true },
      }),
    ).toMatchObject({
      address: postAddress(postNumber),
      sessions: [{ number: 1, globalEventId: event?.id, attachedBy: 'own', reason: null }],
    });
  });
});

describe('A post of several sessions', () => {
  it('gives one event for each, each published on what the rules read of it', async () => {
    const key = 'PGM012002414';
    const session = { end: null, readFrom: 'body', place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)' };
    const post = {
      key,
      address: `https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`,
      title: 'IEEE Authorship Seminar',
      description: '안내',
      sessions: [
        { ...session, number: 1, start: '2026-11-02T10:00:00+09:00' },
        { ...session, number: 2, start: '2026-11-03T10:00:00+09:00' },
        { ...session, number: 3, start: null, readFrom: null },
      ],
    };

    await collected({ app, prisma }, eventsMessage([post], { source: 'extra_snu' }), 'extra_snu');

    const events = await eventsOf(prisma, key, 'extra_snu');
    expect(events.map(({ state, startsAt }) => ({ state, startsAt }))).toEqual(
      expect.arrayContaining([
        { state: 'published', startsAt: new Date('2026-11-02T01:00:00Z') },
        { state: 'published', startsAt: new Date('2026-11-03T01:00:00Z') },
        { state: 'draft', startsAt: null },
      ]),
    );
    expect(events).toHaveLength(3);
    await expect(
      askAsWorker(app, '/global-events/stored-posts', { source: 'extra_snu', keys: [key] }),
    ).resolves.toEqual({ keys: [key] });
  });
});

describe("A session's own title", () => {
  it('names its event in place of the title of the post, and each event keeps the description of the post', async () => {
    const key = 'PGM012002329';
    const session = { start: null, end: null, readFrom: null, place: null };
    const post = {
      key,
      address: `https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`,
      title: '영어 스피치',
      description: '안내',
      sessions: [
        { ...session, number: 1, title: '영어 스피치 (1회차)' },
        { ...session, number: 2, title: '영어 스피치 (2회차)' },
      ],
    };

    await collected({ app, prisma }, eventsMessage([post], { source: 'extra_snu' }), 'extra_snu');

    const events = await eventsOf(prisma, key, 'extra_snu');
    expect(events.map(({ title }) => title).toSorted()).toEqual(['영어 스피치 (1회차)', '영어 스피치 (2회차)']);
    expect(events.map(({ description }) => description)).toEqual(['안내', '안내']);
  });

  it('is not sent for a post of the events list, whose event keeps the title of the post', async () => {
    const postNumber = newPost();
    const post = collectedPost(postNumber);

    await collected({ app, prisma }, eventsMessage([post]));

    expect((await onlyEventOf(prisma, postNumber)).title).toBe(post.title);
  });
});

async function skippedOf(source: 'extra_snu' | 'snu_events'): Promise<number | null | undefined> {
  const status = await prisma.collectionStatus.findUnique({ where: { source } });
  return status?.lastSkippedPosts;
}

describe('The posts a Collection skipped', () => {
  it('are recorded with its status, and the next Collection replaces their number', async () => {
    await collected({ app, prisma }, eventsMessage([], { source: 'extra_snu', skippedPosts: 3 }), 'extra_snu');
    expect(await skippedOf('extra_snu')).toBe(3);

    await collected({ app, prisma }, eventsMessage([], { source: 'extra_snu', skippedPosts: 0 }), 'extra_snu');
    expect(await skippedOf('extra_snu')).toBe(0);
  });

  it('do not make the Collection a failure', async () => {
    const collectedAt = '2026-11-01T06:00:00.000Z';

    await collected(
      { app, prisma },
      eventsMessage([], { source: 'extra_snu', collectedAt, skippedPosts: 1 }),
      'extra_snu',
    );

    await expect(prisma.collectionStatus.findUnique({ where: { source: 'extra_snu' } })).resolves.toMatchObject({
      lastSucceededAt: new Date(collectedAt),
      lastSkippedPosts: 1,
    });
  });

  it('are recorded with a Collection that stopped early too', async () => {
    const message = eventsMessage([], { source: 'extra_snu', failureReason: 'blocked', skippedPosts: 2 });

    await collected({ app, prisma }, message, 'extra_snu');

    await expect(prisma.collectionStatus.findUnique({ where: { source: 'extra_snu' } })).resolves.toMatchObject({
      lastFailureReason: 'blocked',
      lastSkippedPosts: 2,
    });
  });

  it('are left empty by a Source that does not send them', async () => {
    await collected({ app, prisma }, eventsMessage([collectedPost(newPost())]));

    expect(await skippedOf('snu_events')).toBeNull();
  });
});

describe('Source Posts', () => {
  it('of the same key on two Sources are two posts', async () => {
    const postNumber = newPost();

    await send(app, eventsMessage([collectedPost(postNumber)]));
    await collected({ app, prisma }, eventsMessage([collectedPost(postNumber)], { source: 'extra_snu' }), 'extra_snu');
    await stepOver(prisma);

    expect(await prisma.sourcePost.count({ where: { key: String(postNumber) } })).toBe(2);
    expect(
      await prisma.globalEvent.count({ where: { sessions: { some: { sourcePost: { key: String(postNumber) } } } } }),
    ).toBe(2);
  });

  it('can share a Global Event, and no two sessions of a post share a number', async () => {
    const [first, second] = [newPost(), newPost()];
    await collected({ app, prisma }, eventsMessage([collectedPost(first), collectedPost(second)]));
    const event = await onlyEventOf(prisma, first);
    const other = await prisma.sourcePost.findUniqueOrThrow({
      where: { source_key: { source: 'snu_events', key: String(second) } },
    });

    // As the link rule or an Administrator will attach it.
    const attach = (number: number): Promise<unknown> =>
      prisma.sourcePostSession.create({
        data: { sourcePostId: other.id, number, globalEventId: event.id, attachedBy: 'rule', reason: 'a link' },
      });

    await expect(attach(2)).resolves.toBeDefined();
    await expect(attach(2)).rejects.toThrow();
    expect(await prisma.sourcePostSession.count({ where: { globalEventId: event.id } })).toBe(2);
  });
});

describe('A discarded event', () => {
  it('keeps its post stored, so that the next Collection does not bring it back', async () => {
    const postNumber = newPost();
    await collected({ app, prisma }, eventsMessage([collectedPost(postNumber, { place: null })]));
    expect(await discard(postNumber)).toBe(200);

    await expect(
      askAsWorker(app, '/global-events/stored-posts', { source: 'snu_events', keys: [String(postNumber)] }),
    ).resolves.toEqual({ keys: [String(postNumber)] });

    await collected({ app, prisma }, eventsMessage([collectedPost(postNumber)]));

    expect(await eventsOf(prisma, postNumber)).toMatchObject([{ state: 'discarded', publicationRoute: null }]);
  });
});

describe('What the app receives', () => {
  it('carries the address of the post, and not the route, the flag, the links or the post', async () => {
    const postNumber = newPost();
    await collected(
      { app, prisma },
      eventsMessage([collectedPost(postNumber, { start: '2099-10-13T17:00:00+09:00' })]),
    );
    const stored = await prisma.globalEvent.update({
      where: { id: (await onlyEventOf(prisma, postNumber)).id },
      data: { needsAdministrator: true },
    });

    const { accessToken } = await signIn(app);
    const response = await request(app.getHttpServer()).get('/global-events').auth(accessToken, { type: 'bearer' });
    const served: unknown = z
      .array(z.looseObject({ id: z.string() }))
      .parse(response.body)
      .find(({ id }) => id === stored.id);

    // Strict: a field more would fail.
    expect(publishedEventSchema.parse(served)).toMatchObject({ sourceUrl: postAddress(postNumber) });
    expect(served).not.toHaveProperty('publicationRoute');
    expect(served).not.toHaveProperty('needsAdministrator');
    expect(served).not.toHaveProperty('sessions');
    expect(served).not.toHaveProperty('postKey');
  });

  it('is what an Administrator reads with them', async () => {
    const postNumber = newPost();
    await collected({ app, prisma }, eventsMessage([collectedPost(postNumber)]));

    const { accessToken } = await signInAsAdministrator(app);
    const response = await getAdminGlobalEvent(app, accessToken, (await onlyEventOf(prisma, postNumber)).id);

    expect(eventDetailSchema.parse(response.body)).toMatchObject({
      source: 'snu_events',
      postKey: String(postNumber),
      sourceUrl: postAddress(postNumber),
      publicationRoute: 'rule',
      needsAdministrator: false,
    });
  });
});
