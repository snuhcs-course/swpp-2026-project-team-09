import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { CollectionStatus, GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import {
  collectedEvent,
  eventsMessage,
  invalidEventsMessages,
  placesNamingAPlace,
  placesNamingNoPlace,
  postNumbersFrom,
} from './global-events.js';
import { startApp } from './start-app.js';
import { refusal, sendAsWorker } from './worker.js';

let app: INestApplication<Server>;
// No route serves Global Events or the Collection status yet (P12 adds them), so the tests read them with a connection
// of their own.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(inject('settings'));
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

const newPost = postNumbersFrom(900_000);

function storedEvent(postNumber: number): Promise<GlobalEvent | null> {
  return prisma.globalEvent.findUnique({ where: { postNumber } });
}

// Only this file stores events as the events list's Source, so no other file changes its status meanwhile.
function eventsStatus(): Promise<CollectionStatus | null> {
  return prisma.collectionStatus.findUnique({ where: { source: 'snu_events' } });
}

// Sends a post of its own, with `changes` applied, and gives what was stored of it.
async function collect(changes: object): Promise<GlobalEvent | null> {
  const postNumber = newPost();
  await sendAsWorker(app, '/global-events/collected', eventsMessage([collectedEvent(postNumber, changes)]));
  return storedEvent(postNumber);
}

// 뉴미디어통신공동연구소, 132동, on the campus map.
const place132 = { latitude: 37.45487, longitude: 126.95407 };

const noPosition = { latitude: null, longitude: null };

describe('A collected event whose time and place were read', () => {
  it("is published at the position of the Place its place names, with the post's text", async () => {
    const postNumber = newPost();

    await expect(
      sendAsWorker(app, '/global-events/collected', eventsMessage([collectedEvent(postNumber)])),
    ).resolves.toBeUndefined();

    expect(await storedEvent(postNumber)).toMatchObject({
      state: 'published',
      title: '[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내',
      description: '- 일시: 2026. 10. 13.(화) 17:00\n- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      startsAt: new Date('2026-10-13T08:00:00Z'),
      endsAt: null,
      place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
      ...place132,
      version: 1,
      postNumber,
      sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    });
  });

  it('is published with its end when one was read', async () => {
    expect(await collect({ end: '2026-10-13T19:00:00+09:00' })).toMatchObject({
      state: 'published',
      endsAt: new Date('2026-10-13T10:00:00Z'),
    });
  });
});

describe('A collected event that cannot be published', () => {
  it("is a Draft, with the days read, when its start is the header's date", async () => {
    expect(await collect({ start: '2026-10-12', end: '2026-10-16', readFrom: 'header' })).toMatchObject({
      state: 'draft',
      // 00:00 in Asia/Seoul.
      startsAt: new Date('2026-10-11T15:00:00Z'),
      endsAt: new Date('2026-10-15T15:00:00Z'),
      ...place132,
    });
  });

  it.each([
    ["a time read from the header's date", { readFrom: 'header' }, { startsAt: new Date('2026-10-13T08:00:00Z') }],
    [
      "a day without a time from the body's time line",
      { start: '2026-10-13' },
      { startsAt: new Date('2026-10-12T15:00:00Z') },
    ],
    ['no day read', { start: null, readFrom: null }, { startsAt: null }],
  ])('is a Draft when its start is %s', async (_case, changes, stored) => {
    expect(await collect(changes)).toMatchObject({ state: 'draft', ...stored });
  });

  it.each([
    ['a number the list does not hold', '서울대학교 999동 101호'],
    ['two Places by number', '제1공학관(301동) 및 제2공학관(302동)'],
    ['a name that several Places share', '서울대학교 행정대학원 국제회의실'],
    ['no Place, being online', '온라인 (Zoom)'],
  ])('is a Draft without a position when its place names %s', async (_case, place) => {
    expect(await collect({ place })).toMatchObject({ state: 'draft', place, ...noPosition });
  });

  it('is a Draft when no place was read', async () => {
    expect(await collect({ place: null })).toMatchObject({ state: 'draft', place: null, ...noPosition });
  });

  it('is a Draft with its title alone when the worker could not read its page', async () => {
    const unread = { description: '', start: null, end: null, readFrom: null, place: null };

    expect(await collect(unread)).toMatchObject({ state: 'draft', description: '', startsAt: null, ...noPosition });
  });
});

describe('The place of a collected event', () => {
  it.each(placesNamingAPlace)('names a Place %s', async (_case, place, position) => {
    expect(await collect({ place })).toMatchObject({ state: 'published', ...position });
  });

  it.each(placesNamingNoPlace)('names no Place when it holds %s', async (_case, place) => {
    expect(await collect({ place })).toMatchObject({ state: 'draft', place, ...noPosition });
  });
});

describe('A post that is already stored', () => {
  it('is stored once when it is sent twice', async () => {
    const postNumber = newPost();
    const message = eventsMessage([collectedEvent(postNumber)]);
    await sendAsWorker(app, '/global-events/collected', message);
    const stored = await storedEvent(postNumber);

    await expect(sendAsWorker(app, '/global-events/collected', message)).resolves.toBeUndefined();

    expect(await storedEvent(postNumber)).toEqual(stored);
  });

  it.each([
    ['published', {}],
    // Moved to 제2공학관, 302동.
    [
      'edited',
      { title: '설명회 (장소 변경)', place: '제2공학관 101호', latitude: 37.44887, longitude: 126.95265, version: 2 },
    ],
    ['discarded', { state: 'discarded' as const }],
  ])('is left as it is when it was %s', async (_case, changes) => {
    const postNumber = newPost();
    await sendAsWorker(app, '/global-events/collected', eventsMessage([collectedEvent(postNumber)]));
    // As an Administrator would change it.
    const stored = await prisma.globalEvent.update({ where: { postNumber }, data: changes });

    // The post as a later Collection would read it, had the Source changed it.
    const changed = collectedEvent(postNumber, { title: '설명회 (온라인 전환)', place: '온라인 (Zoom)' });
    await sendAsWorker(
      app,
      '/global-events/collected',
      eventsMessage([changed], { collectedAt: '2026-10-02T12:00:00+09:00' }),
    );

    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});

describe('An events message that does not match the schema', () => {
  it.each(invalidEventsMessages)(
    'is refused when it has %s, and nothing from it is stored',
    async (_problem, message, named) => {
      const [valid, other] = [newPost(), newPost()];
      const status = await eventsStatus();

      expect(await refusal(app, '/global-events/collected', message(valid, other))).toContain(named);
      expect(await storedEvent(valid)).toBeNull();
      expect(await eventsStatus()).toEqual(status);
    },
  );
});

describe('A Collection of the events list', () => {
  it('is recorded with its time when its message is stored', async () => {
    await sendAsWorker(
      app,
      '/global-events/collected',
      eventsMessage([], { collectedAt: '2026-10-02T18:00:00+09:00' }),
    );

    expect(await eventsStatus()).toMatchObject({ lastSucceededAt: new Date('2026-10-02T09:00:00Z') });
  });

  it('that failed is recorded with its time and reason, and the stored events stay', async () => {
    const postNumber = newPost();
    await sendAsWorker(app, '/global-events/collected', eventsMessage([collectedEvent(postNumber)]));
    const stored = await storedEvent(postNumber);

    await expect(
      sendAsWorker(app, '/collections/failed', {
        source: 'snu_events',
        failedAt: '2026-10-03T00:00:00+09:00',
        reason: 'The page has no post',
      }),
    ).resolves.toBeUndefined();

    expect(await eventsStatus()).toMatchObject({
      lastFailedAt: new Date('2026-10-02T15:00:00Z'),
      lastFailureReason: 'The page has no post',
    });
    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});

describe('A Collection of the events list that stopped early', () => {
  it('stores the posts read before it, and is recorded as failed but not as successful', async () => {
    const postNumber = newPost();
    await sendAsWorker(
      app,
      '/global-events/collected',
      eventsMessage([], { collectedAt: '2026-10-03T00:00:00+09:00' }),
    );

    await sendAsWorker(
      app,
      '/global-events/collected',
      eventsMessage([collectedEvent(postNumber)], { collectedAt: '2026-10-03T06:00:00+09:00', complete: false }),
    );
    await sendAsWorker(app, '/collections/failed', {
      source: 'snu_events',
      failedAt: '2026-10-03T06:00:00+09:00',
      reason: "The university's firewall blocked https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525",
    });

    expect(await storedEvent(postNumber)).toMatchObject({ postNumber });
    expect(await eventsStatus()).toMatchObject({
      lastSucceededAt: new Date('2026-10-02T15:00:00Z'),
      lastFailedAt: new Date('2026-10-02T21:00:00Z'),
    });
  });
});
