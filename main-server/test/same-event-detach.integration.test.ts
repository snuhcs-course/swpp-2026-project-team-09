/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { eventsMessage } from './global-events.js';
import { START } from './same-event.js';
import { LATER, QueueWorld } from './same-event-queue.js';
import { signalsWhile } from './signals.js';
import { send } from './source-posts.js';

const world = new QueueWorld(994000);

beforeAll(async () => {
  await world.start();
});

// Each test starts with no event near its own.
afterEach(async () => {
  vi.restoreAllMocks();
  await world.clear();
});

afterAll(async () => {
  await world.stop();
});

describe('The sessions of an event', () => {
  it('lists its Source Posts, how each was attached and which can be detached', async () => {
    const { eventId, post, sessionId } = await world.attachedPost();

    const { body } = await world.admin('get', `/${eventId}/sessions`).expect(200);

    expect(body).toEqual([
      expect.objectContaining({ source: 'extra_snu', attachedBy: 'own', detachable: false }),
      expect.objectContaining({
        sessionId,
        source: 'snu_events',
        key: post.key,
        address: post.address,
        number: 1,
        attachedBy: 'ai',
        reason: '같은 행사입니다',
        detachable: true,
      }),
    ]);
  });
});

describe('Detaching a session', () => {
  it('makes it its own Draft again with a new id, and the event stays', async () => {
    const { eventId, post, sessionId } = await world.attachedPost();
    const before = await world.stored(eventId);

    const signals = await signalsWhile(world.judging, world.posts.watcher, 'global-events-changed', () =>
      world.admin('post', `/sessions/${sessionId}/detach`).expect(204),
    );

    const session = await world.onlySession('snu_events', post);
    expect(session).toMatchObject({
      attachedBy: 'own',
      reason: null,
      ownDraft: null,
      readByRules: false,
      heldFor: null,
      globalEvent: { state: 'draft', title: post.title, startsAt: new Date(START) },
    });
    expect(session.globalEventId).not.toBe(eventId);
    expect(await world.stored(eventId)).toEqual(before);
    expect(signals).toEqual([]);
  });

  it('lets one of two Administrators through, and refuses a session of its own', async () => {
    const { eventId, sessionId } = await world.attachedPost();

    const statuses = await Promise.all([
      world.admin('post', `/sessions/${sessionId}/detach`),
      world.admin('post', `/sessions/${sessionId}/detach`),
    ]);

    expect(statuses.map(({ status }) => status).toSorted()).toEqual([204, 409]);
    const [own] = await world.prisma.sourcePostSession.findMany({ where: { globalEventId: eventId } });
    await world.admin('post', `/sessions/${own.id}/detach`).expect(409);
  });
});

describe('Detaching, then what comes after', () => {
  it('refuses a session that kept nothing of its Draft', async () => {
    const { sessionId } = await world.attachedPost();
    await world.prisma.$executeRaw`UPDATE source_post_sessions SET own_draft = NULL WHERE id = ${sessionId}::uuid`;

    const { body } = await world.admin('post', `/sessions/${sessionId}/detach`).expect(409);

    expect(body).toMatchObject({ code: 'SESSION_NOT_DETACHABLE' });
  });

  it('stays as it is through the next Collection and a run over its Draft, asking no model', async () => {
    const { eventId, post, sessionId } = await world.attachedPost();
    await world.admin('post', `/sessions/${sessionId}/detach`).expect(204);
    const { globalEventId: draftId } = await world.onlySession('snu_events', post);
    await world.prisma.sourcePost.updateMany({
      where: { source: 'snu_events', key: String(post.key) },
      data: { stepFinishedAt: null },
    });
    world.scripted.script();

    await send(world.judging, eventsMessage([]));
    await world.collectedOf('snu_events', post);
    await world.step.overDraft(draftId);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: draftId,
      attachedBy: 'own',
      globalEvent: { state: 'draft' },
    });
    expect(world.scripted.received()).toHaveLength(0);
    expect((await world.stored(eventId)).state).toBe('published');
  });
});

describe('The flag', () => {
  it('stays through a detach, and an Administrator takes it off without a new version', async () => {
    const { eventId, sessionId } = await world.attachedPost({ start: '2027-03-11T14:00:00+09:00' });
    const flagged = await world.stored(eventId);
    expect(flagged.needsAdministrator).toBe(true);

    await world.admin('post', `/sessions/${sessionId}/detach`).expect(204);
    expect((await world.stored(eventId)).needsAdministrator).toBe(true);

    await world.admin('post', `/${eventId}/acknowledge`).expect(204);
    expect(await world.stored(eventId)).toMatchObject({ needsAdministrator: false, version: flagged.version });
  });

  it('answers 404 for an event that does not exist', async () => {
    await world.admin('post', '/00000000-0000-4000-8000-000000000000/acknowledge').expect(404);
  });
});

describe('What the apps read', () => {
  it('holds neither a queued Draft nor an attached session as a second event', async () => {
    const { eventId, post } = await world.attachedPost();
    const { queued } = await world.heldPost(LATER);
    const services = await import('../src/global-events/global-events.service.js');
    const events = world.judging.get(services.GlobalEventsService);
    const now = new Date('2027-03-01T00:00:00+09:00');

    const searched = await events.searchPublished({ title: String(post.title) }, now);
    expect(searched).toHaveLength(0);
    const near = await events.searchPublished({}, now);
    expect(near.filter(({ id }) => id === eventId)).toHaveLength(1);
    expect(near.map(({ id }) => id)).not.toContain(queued.draft.id);
    expect((await events.listPublished()).map(({ id }) => id)).not.toContain(queued.draft.id);
    expect((await events.publishedAmong([eventId, queued.draft.id])).map(({ id }) => id)).toEqual([eventId]);
  });

  it('carries none of what Administrators read', async () => {
    const { eventId } = await world.attachedPost();
    const events = (await import('../src/global-events/global-events.service.js')).GlobalEventsService;

    const event = (await world.judging.get(events).publishedAmong([eventId]))[0];

    expect(Object.keys(event).toSorted()).toEqual(
      ['description', 'endsAt', 'id', 'latitude', 'longitude', 'place', 'sourceUrl', 'startsAt', 'title'].toSorted(),
    );
  });
});
