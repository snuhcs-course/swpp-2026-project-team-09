import { PrismaPg } from '@prisma/adapter-pg';
import { inject } from 'vitest';
import { CollectionStatus, GlobalEvent, PrismaClient } from '../src/generated/prisma/client.js';
import { collectedEvent, eventsMessage, postNumbersFrom } from './global-events.js';
import { refusal, sendAsWorker, startWithWorker, type WorkerHarness } from './worker.js';

let harness: WorkerHarness;
// No route serves Global Events or the Collection status yet (P12 adds them), so the tests read them with a connection
// of their own.
let prisma: PrismaClient;

beforeAll(async () => {
  harness = await startWithWorker();
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: inject('settings').DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await harness.close();
});

const newPost = postNumbersFrom(910_000);

function storedEvent(postNumber: number): Promise<GlobalEvent | null> {
  return prisma.globalEvent.findUnique({ where: { postNumber } });
}

// Only this file sends as the events list's Source, so no other file changes its status meanwhile.
function eventsStatus(): Promise<CollectionStatus | null> {
  return prisma.collectionStatus.findUnique({ where: { source: 'snu_events' } });
}

describe('The same post sent twice', () => {
  it('is stored once, as the first message stored it', async () => {
    const postNumber = newPost();
    const message = eventsMessage([collectedEvent(postNumber)]);
    await sendAsWorker(harness.worker, 'events-collected', message);
    const stored = await storedEvent(postNumber);

    await expect(sendAsWorker(harness.worker, 'events-collected', message)).resolves.toEqual({ status: 'ok' });

    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});

describe('A post that is already stored', () => {
  it.each([
    ['published', {}],
    [
      'edited by an Administrator',
      // Moved to 제2공학관, 302동.
      { title: '설명회 (장소 변경)', place: '제2공학관 101호', latitude: 37.44887, longitude: 126.95265, version: 2 },
    ],
    ['discarded', { state: 'discarded' as const }],
  ])('is left as it is when it was %s', async (_case, changes) => {
    const postNumber = newPost();
    await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber)]));
    const stored = await prisma.globalEvent.update({ where: { postNumber }, data: changes });

    // The post as a later Collection would read it, had the Source changed it.
    const changed = collectedEvent(postNumber, { title: '설명회 (온라인 전환)', place: '온라인 (Zoom)' });
    await sendAsWorker(
      harness.worker,
      'events-collected',
      eventsMessage([changed], { collectedAt: '2026-10-02T12:00:00+09:00' }),
    );

    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});

describe("The worker's question about stored posts", () => {
  it('is answered with the posts stored, in any state, and not with an unknown one', async () => {
    const [published, discarded, unknown] = [newPost(), newPost(), newPost()];
    await sendAsWorker(
      harness.worker,
      'events-collected',
      eventsMessage([collectedEvent(published), collectedEvent(discarded)]),
    );
    await prisma.globalEvent.update({ where: { postNumber: discarded }, data: { state: 'discarded' } });

    await expect(
      sendAsWorker(harness.worker, 'stored-event-posts', { postNumbers: [unknown, discarded, published] }),
    ).resolves.toEqual({ postNumbers: [discarded, published] });
  });

  it('is refused when a post number is not a number', async () => {
    expect(await refusal(harness.worker, 'stored-event-posts', { postNumbers: ['176525'] })).toContain(
      'postNumbers.0: ',
    );
  });
});

// A time no stored message of this file carries, so that a success recorded for a refused message would be seen.
const refusedAt = { collectedAt: '2026-10-31T06:00:00+09:00' };

// A valid post, then one with `changes`, so that storing nothing is seen.
function secondChanged(valid: number, changes: object): object {
  return eventsMessage([collectedEvent(valid), collectedEvent(newPost(), changes)], refusedAt);
}

// The problem, the message for a valid post and what the answer names.
const invalidEvents: [string, (valid: number) => object, string][] = [
  [
    'a start that is neither a time nor a day',
    (valid) => secondChanged(valid, { start: '10. 13.(화) 17:00' }),
    'events.1.start: ',
  ],
  ['a time without its offset', (valid) => secondChanged(valid, { end: '2026-10-13T19:00:00' }), 'events.1.end: '],
  [
    'a source other than the time line or the header',
    (valid) => secondChanged(valid, { readFrom: 'title' }),
    'events.1.readFrom: ',
  ],
  [
    'a post number that is not a number',
    (valid) => secondChanged(valid, { postNumber: '176525' }),
    'events.1.postNumber: ',
  ],
  ['a field the schema does not know', (valid) => secondChanged(valid, { poster: 'poster.jpg' }), 'events.1: '],
  [
    'the same post twice',
    (valid) => eventsMessage([collectedEvent(valid), collectedEvent(valid)], refusedAt),
    'events: Each post must appear once',
  ],
  [
    'a Source that has no events',
    (valid) => eventsMessage([collectedEvent(valid)], { ...refusedAt, source: 'coop_menus' }),
    'source: ',
  ],
];

describe('An events message that does not match the schema', () => {
  it.each(invalidEvents)(
    'is refused when it has %s, and nothing from it is stored',
    async (_problem, message, named) => {
      const valid = newPost();
      const status = await eventsStatus();

      expect(await refusal(harness.worker, 'events-collected', message(valid))).toContain(named);
      expect(await storedEvent(valid)).toBeNull();
      expect(await eventsStatus()).toEqual(status);
    },
  );
});

describe('A Collection of the events list', () => {
  it('is recorded with its time when its message is stored', async () => {
    await sendAsWorker(
      harness.worker,
      'events-collected',
      eventsMessage([], { collectedAt: '2026-10-02T18:00:00+09:00' }),
    );

    expect(await eventsStatus()).toMatchObject({ lastSucceededAt: new Date('2026-10-02T09:00:00Z') });
  });

  it('that failed is recorded with its time and reason, and the stored events stay', async () => {
    const postNumber = newPost();
    await sendAsWorker(harness.worker, 'events-collected', eventsMessage([collectedEvent(postNumber)]));
    const stored = await storedEvent(postNumber);

    await expect(
      sendAsWorker(harness.worker, 'collection-failed', {
        source: 'snu_events',
        failedAt: '2026-10-03T00:00:00+09:00',
        reason: 'The page has no post',
      }),
    ).resolves.toEqual({ status: 'ok' });

    expect(await eventsStatus()).toMatchObject({
      lastFailedAt: new Date('2026-10-02T15:00:00Z'),
      lastFailureReason: 'The page has no post',
    });
    expect(await storedEvent(postNumber)).toEqual(stored);
  });
});
