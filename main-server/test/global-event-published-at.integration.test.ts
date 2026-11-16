/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// When each of the four writes that publish a Global Event records `publishedAt`, which the lists give:
// the rules, a Judgement, an Administrator's publish of a Draft and the Same-event queue's publish. An event published
// before it was recorded keeps null, and an edit keeps what was recorded.

import { publishedAmong, type PublishedEvent } from './global-event-lists.js';
import { answer, draftPost } from './judgements.js';
import { storeEvent } from './quests.js';
import { QueueWorld } from './same-event-queue.js';
import { signIn } from './sign-in.js';

const world = new QueueWorld(997_000);
let accessToken: string;

beforeAll(async () => {
  await world.start();
  ({ accessToken } = await signIn(world.judging));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.clear();
});

afterAll(async () => {
  await world.stop();
});

// The event as the User's list serves it.
async function listed(id: string): Promise<PublishedEvent> {
  const [event] = await publishedAmong(world.judging, accessToken, [id]);
  if (event === undefined) {
    throw new Error(`Event ${id} is not in the User's list`);
  }
  return event;
}

// What `published` did, and the times just before and after it.
async function timed(published: () => Promise<string>): Promise<{ id: string; before: Date; after: Date }> {
  const before = new Date();
  const id = await published();
  return { id, before, after: new Date() };
}

function expectPublishedBetween(event: PublishedEvent, before: Date, after: Date): void {
  expect(event.publishedAt).not.toBeNull();
  const at = new Date(event.publishedAt ?? '').getTime();
  expect(at).toBeGreaterThanOrEqual(before.getTime());
  expect(at).toBeLessThanOrEqual(after.getTime());
}

describe('A Global Event published', () => {
  it('by the rules records when', async () => {
    const { id, before, after } = await timed(
      async () => (await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()))).id,
    );

    expectPublishedBetween(await listed(id), before, after);
  });

  it('by a Judgement records when', async () => {
    world.scripted.script(answer());
    const post = draftPost(world.postNumber());

    const { id, before, after } = await timed(async () => {
      await world.collectedOf('snu_events', post);
      const { globalEvent } = await world.onlySession('snu_events', post);
      expect(globalEvent).toMatchObject({ state: 'published', publicationRoute: 'judgement' });
      return globalEvent.id;
    });

    expectPublishedBetween(await listed(id), before, after);
  });

  it("by an Administrator's publish of a Draft records when", async () => {
    const draft = await storeEvent(world.prisma, { state: 'draft' });

    const { id, before, after } = await timed(async () => {
      await world.admin('post', `/${draft.id}/publish`).send({ version: 1 }).expect(200);
      return draft.id;
    });

    expectPublishedBetween(await listed(id), before, after);
  });

  it("by an Administrator's publish from the Same-event queue records when", async () => {
    const { queued } = await world.heldPost();

    const { id, before, after } = await timed(async () => {
      await world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 1 }).expect(204);
      return queued.draft.id;
    });

    expectPublishedBetween(await listed(id), before, after);
  });
});

describe("A Global Event's publishedAt", () => {
  it('stays when an Administrator edits its time', async () => {
    const draft = await storeEvent(world.prisma, { state: 'draft' });
    await world.admin('post', `/${draft.id}/publish`).send({ version: 1 }).expect(200);
    const { publishedAt } = await listed(draft.id);

    await world
      .admin('patch', `/${draft.id}`)
      .send({ version: 2, startsAt: '2099-12-01T10:00:00+09:00', endsAt: '2099-12-01T12:00:00+09:00' })
      .expect(200);

    expect(await listed(draft.id)).toMatchObject({ startsAt: '2099-12-01T01:00:00.000Z', publishedAt });
  });

  it('is null for an event published before it was recorded, and an edit leaves it null', async () => {
    const older = await storeEvent(world.prisma);

    await world.admin('patch', `/${older.id}`).send({ version: 1, title: '고친 제목' }).expect(200);

    expect(await listed(older.id)).toMatchObject({ title: '고친 제목', publishedAt: null });
  });
});
