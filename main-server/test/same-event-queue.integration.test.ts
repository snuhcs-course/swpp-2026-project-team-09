/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { draftPost } from './judgements.js';
import { linkTo, sessionsOf, START } from './same-event.js';
import { LATER, QueueWorld } from './same-event-queue.js';
import { signalsWhile } from './signals.js';

const world = new QueueWorld(993000);

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

describe('Listing the queue', () => {
  it('shows a session with why it waits, what the AI said, its Draft and its candidates', async () => {
    const { eventId, queued } = await world.heldPost();

    expect(queued).toMatchObject({
      heldFor: 'ai_unsure',
      reason: '확실하지 않습니다',
      draft: { version: 1, missing: [] },
    });
    expect(queued.candidates.map(({ id }) => id)).toContain(eventId);
  });

  it('works the candidates out when asked: a cancelled one says so, a removed one goes', async () => {
    const {
      eventId,
      post,
      queued: { candidates },
    } = await world.heldPost();
    expect(candidates.find(({ id }) => id === eventId)?.state).toBe('published');

    await world.prisma.globalEvent.update({ where: { id: eventId }, data: { state: 'cancelled' } });
    expect((await world.queuedOf(post)).candidates.find(({ id }) => id === eventId)?.state).toBe('cancelled');

    await world.prisma.globalEvent.delete({ where: { id: eventId } });
    expect((await world.queuedOf(post)).candidates.map(({ id }) => id)).not.toContain(eventId);
  });

  it('gives a session the link rule held the events of the linked post, with no time read', async () => {
    const linked = world.programme(world.uniqueTitle(), {
      sessions: sessionsOf(2),
    });
    await world.collectedOf('extra_snu', linked);
    const { sessions } = await world.sourcePostOf('extra_snu', linked);
    const post = draftPost(world.postNumber(), { description: linkTo(linked), start: null });
    world.scripted.script();

    await world.collectedOf('snu_events', post);

    const queued = await world.queuedOf(post);
    expect(queued.heldFor).toBe('link_not_one_to_one');
    expect(queued.draft.missing).toContain('startsAt');
    expect(queued.candidates.map(({ id }) => id).toSorted()).toEqual(
      sessions.map(({ globalEventId }) => globalEventId).toSorted(),
    );
  });
});

describe('Attaching a queued session', () => {
  it('moves it to the event as an Administrator did, removes its Draft and tells no app', async () => {
    const { eventId, post, queued } = await world.heldPost();

    const signals = await signalsWhile(world.judging, world.posts.watcher, 'global-events-changed', () =>
      world.admin('post', `/queue/${queued.sessionId}/attach`).send({ version: 1, globalEventId: eventId }).expect(204),
    );

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: eventId,
      attachedBy: 'administrator',
      heldFor: null,
      reason: null,
      ownDraft: { title: post.title },
    });
    expect(await world.prisma.globalEvent.count({ where: { id: queued.draft.id } })).toBe(0);
    expect(signals).toEqual([]);
    expect((await world.queue()).map(({ sessionId }) => sessionId)).not.toContain(queued.sessionId);
  });

  it('takes a Draft an Administrator changed, at its new version', async () => {
    const { eventId, post, queued } = await world.heldPost();
    await world.admin('patch', `/${queued.draft.id}`).send({ version: 1, title: '고친 제목' }).expect(200);

    await world
      .admin('post', `/queue/${queued.sessionId}/attach`)
      .send({ version: 1, globalEventId: eventId })
      .expect(409);
    await world
      .admin('post', `/queue/${queued.sessionId}/attach`)
      .send({ version: 2, globalEventId: eventId })
      .expect(204);

    expect((await world.onlySession('snu_events', post)).ownDraft).toMatchObject({ title: '고친 제목' });
  });
});

describe('Attaching a queued session that has changed', () => {
  it('refuses an event that is not its candidate', async () => {
    const { queued } = await world.heldPost();
    const far = await world.publishedThrough(
      'extra_snu',
      world.programme(world.uniqueTitle(), { start: '2027-09-01T14:00:00+09:00' }),
    );

    const response = await world
      .admin('post', `/queue/${queued.sessionId}/attach`)
      .send({ version: 1, globalEventId: far.id })
      .expect(409);

    expect(response.body).toMatchObject({ code: 'CANDIDATE_GONE' });
  });

  it('lets one of two Administrators through', async () => {
    const { eventId, queued } = await world.heldPost();
    const body = { version: 1, globalEventId: eventId };

    const statuses = await Promise.all([
      world.admin('post', `/queue/${queued.sessionId}/attach`).send(body),
      world.admin('post', `/queue/${queued.sessionId}/attach`).send(body),
    ]);

    expect(statuses.map(({ status }) => status).toSorted((a, b) => a - b)).toEqual([204, 409]);
  });
});

describe('Publishing a queued session as its own', () => {
  it('publishes it by an Administrator, takes it out of the queue and tells the apps', async () => {
    const { post, queued } = await world.heldPost();

    const signals = await signalsWhile(world.judging, world.posts.watcher, 'global-events-changed', () =>
      world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 1 }).expect(204),
    );

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      heldFor: null,
      globalEvent: { state: 'published', publicationRoute: 'administrator', version: 2 },
    });
    expect(signals).toHaveLength(1);
    expect(await world.appLists(queued.draft.id)).toBe(true);
  });

  it('refuses a Draft without a time or a place, and takes it once they are filled in', async () => {
    const linked = world.programme(world.uniqueTitle(), {
      sessions: sessionsOf(2),
    });
    await world.collectedOf('extra_snu', linked);
    const post = draftPost(world.postNumber(), { description: linkTo(linked), start: null });
    world.scripted.script();
    await world.collectedOf('snu_events', post);
    const queued = await world.queuedOf(post);

    const response = await world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 1 }).expect(409);

    expect(response.body).toMatchObject({ code: 'GLOBAL_EVENT_INCOMPLETE', missing: ['startsAt', 'position'] });
    expect((await world.queuedOf(post)).sessionId).toBe(queued.sessionId);

    await world
      .admin('patch', `/${queued.draft.id}`)
      .send({ version: 1, startsAt: START, place: '관악', latitude: 37.46, longitude: 126.95 })
      .expect(200);
    await world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 2 }).expect(204);

    expect((await world.onlySession('snu_events', post)).globalEvent.state).toBe('published');
  });
});

describe('Publishing a queued session, refused', () => {
  it('lets one of two Administrators through', async () => {
    const { queued } = await world.heldPost();

    const statuses = await Promise.all([
      world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 1 }),
      world.admin('post', `/queue/${queued.sessionId}/publish`).send({ version: 1 }),
    ]);

    expect(statuses.map(({ status }) => status).toSorted((a, b) => a - b)).toEqual([204, 409]);
  });

  it('takes a queued Draft out when it is published or discarded on its own page', async () => {
    const [published, discarded] = [await world.heldPost(), await world.heldPost(LATER)];

    await world.admin('post', `/${published.queued.draft.id}/publish`).send({ version: 1 }).expect(200);
    await world.admin('post', `/${discarded.queued.draft.id}/discard`).send({ version: 1 }).expect(200);

    expect((await world.onlySession('snu_events', published.post)).heldFor).toBeNull();
    expect((await world.onlySession('snu_events', discarded.post)).heldFor).toBeNull();
  });
});

describe('A queued session in the step', () => {
  it('is neither judged nor published by the next Collection or a run over its Draft', async () => {
    const { post, queued } = await world.heldPost();
    world.scripted.script();

    await world.nextCollection();
    await world.step.overDraft(queued.draft.id);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      heldFor: 'ai_unsure',
      globalEvent: { state: 'draft', version: 1 },
    });
    expect(world.scripted.received()).toHaveLength(0);
  });
});
