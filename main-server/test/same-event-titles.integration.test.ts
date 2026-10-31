/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { changeState, createDraft } from './global-event-changes.js';
import { getAdminGlobalEvent, publishedAmong } from './global-event-lists.js';
import { answer } from './judgements.js';
import { PLACE, PUBLISHED_OWN, SameEventWorld, sessionsOf, START } from './same-event.js';
import { signalsWhile } from './signals.js';
import { signIn } from './sign-in.js';

const world = new SameEventWorld(987_000);
let app: INestApplication<Server>;
let readingToken: string;

beforeAll(async () => {
  await world.start();
  app = world.judging;
  ({ accessToken: readingToken } = await signIn(app));
});

afterEach(async () => {
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

describe('Equal normalised titles with equal starts', () => {
  it('attach across Sources, keep what the Draft held, and tell no app', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('snu_events', world.snuPost(title));
    const written = `[중앙도서관] ${title}`;
    const post = world.programme(written);

    const signals = await signalsWhile(app, world.posts.watcher, 'global-events-changed', () =>
      world.collectedOf('extra_snu', post),
    );

    expect(await world.onlySession('extra_snu', post)).toMatchObject({
      globalEventId: event.id,
      attachedBy: 'rule',
      reason: 'equal_title_and_start',
      ownDraft: { title: written, description: '본문', place: PLACE },
    });
    expect(await world.stored(event.id)).toEqual(event);
    expect(signals).toEqual([]);
    expect(await world.prisma.globalEvent.count({ where: { title: written } })).toBe(0);
  });
});

describe('An event with an attached post', () => {
  it('keeps its address, and the event once in each list', async () => {
    const original = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', original);

    await world.collectedOf('extra_snu', world.programme(String(original.title)));

    const read = await publishedAmong(app, readingToken, [event.id]);
    expect(read.map(({ sourceUrl }) => sourceUrl)).toEqual([original.address]);
    const { GlobalEventsService } = await import('../src/global-events/global-events.service.js');
    const events = app.get(GlobalEventsService);
    const isIt = ({ id }: { id: string }): boolean => id === event.id;
    const found = await events.searchPublished(
      { title: String(original.title), take: 100 },
      new Date('2026-11-01T00:00:00+09:00'),
    );
    expect(found.filter((each) => isIt(each))).toHaveLength(1);
    expect((await events.publishedAmong([event.id])).map(({ sourceUrl }) => sourceUrl)).toEqual([original.address]);
    expect((await events.listPublished()).filter((each) => isIt(each))).toHaveLength(1);
    const detail = await getAdminGlobalEvent(app, world.administrator, event.id);
    expect(detail.body).toMatchObject({ source: 'snu_events', postKey: original.key, sourceUrl: original.address });
  });

  it.each([
    ['1차 against 2차', '특강 (1차)', '특강 (2차)'],
    ['대면 against 비대면', '특강 (대면)', '특강 (비대면)'],
    ['different roles', '행사 (헬퍼)', '행사 (디자이너)'],
  ])('are refused by the rules for %s', async (_case, first, second) => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('snu_events', world.snuPost(`${title} ${first}`));
    const post = world.programme(`${title} ${second}`);

    await world.collectedOf('extra_snu', post);

    const session = await world.onlySession('extra_snu', post);
    expect(session).toMatchObject(PUBLISHED_OWN);
    expect(session.globalEventId).not.toBe(event.id);
  });
});

describe('Equal titles with other starts', () => {
  it.each([
    ['another time of the day', '2027-03-10T15:00:00+09:00'],
    ['the day before', '2027-03-09T14:00:00+09:00'],
    ['the day after', '2027-03-11T14:00:00+09:00'],
  ])('do not hold for a start at %s: it is published as its own', async (_case, start) => {
    const title = world.uniqueTitle();
    await world.publishedThrough('snu_events', world.snuPost(title));
    const post = world.programme(title, { start });

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject(PUBLISHED_OWN);
  });
});

describe('The candidates', () => {
  it('hold a session that matches several, and a held Draft is no candidate', async () => {
    const title = world.uniqueTitle();
    await world.publishedThrough('snu_events', world.snuPost(title));
    await createDraft(app, world.administrator, { title, startsAt: START });
    const [first, second] = [world.programme(title), world.programme(title)];

    await world.collectedOf('extra_snu', first);
    await world.collectedOf('extra_snu', second);

    const held = { heldFor: 'several_matches', attachedBy: 'own', globalEvent: { state: 'draft' } };
    expect(await world.onlySession('extra_snu', first)).toMatchObject(held);
    expect(await world.onlySession('extra_snu', second)).toMatchObject(held);
  });

  it('take in an event an Administrator cancelled, which stays so', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('snu_events', world.snuPost(title));
    await changeState(app, world.administrator, event.id, 'cancel', event.version);
    const post = world.programme(title);

    await world.collectedOf('extra_snu', post);

    expect((await world.onlySession('extra_snu', post)).globalEventId).toBe(event.id);
    expect((await world.stored(event.id)).state).toBe('cancelled');
  });

  it('take in an event an Administrator discarded, which stays so', async () => {
    const title = world.uniqueTitle();
    const original = world.snuPost(title, { place: null });
    world.scripted.script(answer([], false));
    await world.collectedOf('snu_events', original);
    const { globalEvent } = await world.onlySession('snu_events', original);
    await changeState(app, world.administrator, globalEvent.id, 'discard', globalEvent.version);
    const post = world.programme(title);

    await world.collectedOf('extra_snu', post);

    expect((await world.onlySession('extra_snu', post)).globalEventId).toBe(globalEvent.id);
    expect((await world.stored(globalEvent.id)).state).toBe('discarded');
  });
});

describe('The Drafts among the candidates', () => {
  it('take in a Draft an Administrator made, which stays a Draft', async () => {
    const title = world.uniqueTitle();
    const draft = await createDraft(app, world.administrator, { title, startsAt: START });
    const post = world.programme(title);

    await world.collectedOf('extra_snu', post);

    expect((await world.onlySession('extra_snu', post)).globalEventId).toBe(draft.id);
    expect((await world.stored(draft.id)).state).toBe('draft');
  });

  it('leave out a Draft whose time nobody read: its start may be an application period', async () => {
    const title = world.uniqueTitle();
    world.scripted.script(answer([], false));
    await world.collectedOf('snu_events', world.snuPost(title, { readFrom: 'header', place: null }));
    const post = world.programme(title);

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject(PUBLISHED_OWN);
  });
});

describe('The posts of one message', () => {
  it('take in the first of two posts of one message for the second', async () => {
    const title = world.uniqueTitle();
    const [first, second] = [world.snuPost(title), world.snuPost(`[재공지] ${title}`)];

    await world.collectedOf('snu_events', first, second);

    const own = await world.onlySession('snu_events', first);
    expect(own.globalEvent.state).toBe('published');
    expect(await world.onlySession('snu_events', second)).toMatchObject({
      globalEventId: own.globalEventId,
      attachedBy: 'rule',
    });
  });

  it("leave out the post's own sessions", async () => {
    const post = world.snuPost(world.uniqueTitle(), { sessions: sessionsOf(2) });

    await world.collectedOf('snu_events', post);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions).toMatchObject([PUBLISHED_OWN, PUBLISHED_OWN]);
    expect(new Set(sessions.map(({ globalEventId }) => globalEventId)).size).toBe(2);
  });
});
