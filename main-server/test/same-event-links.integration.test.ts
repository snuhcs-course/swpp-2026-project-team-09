/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { eventsMessage } from './global-events.js';
import { draftPost, PLACE_LINE, TIME_LINE } from './judgements.js';
import { linkTo, PUBLISHED_OWN, SameEventWorld, sessionsOf } from './same-event.js';
import { signalsWhile } from './signals.js';
import { send } from './source-posts.js';

const world = new SameEventWorld(986_000);
let app: INestApplication<Server>;

beforeAll(async () => {
  await world.start();
  app = world.judging;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

describe('A post whose body links a stored post', () => {
  it('is attached whatever its time: the event stays as it was and is flagged', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.programme('제목이 전혀 다른 글', {
      start: '2027-04-01T09:00:00+09:00',
      description: linkTo(linked),
    });

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject({
      globalEventId: event.id,
      attachedBy: 'rule',
      reason: 'link',
      heldFor: null,
    });
    expect(await world.stored(event.id)).toEqual({ ...event, needsAdministrator: true });
  });

  it('does not flag an event with the same time', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);

    await world.collectedOf('extra_snu', world.programme('다른 제목', { description: linkTo(linked) }));

    expect((await world.stored(event.id)).needsAdministrator).toBe(false);
  });

  it('does not flag an event over a date the rules did not read from the body', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.programme('다른 제목', {
      readFrom: 'header',
      start: '2027-02-01',
      description: linkTo(linked),
    });

    await world.collectedOf('extra_snu', post);

    expect((await world.stored(event.id)).needsAdministrator).toBe(false);
  });
});

describe('A post whose body links a stored post, read and decided', () => {
  it('is read from the links of the message when words hide the address', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.programme('다른 제목', { description: '신청하기', links: [String(linked.address)] });

    await world.collectedOf('extra_snu', post);

    expect((await world.onlySession('extra_snu', post)).globalEventId).toBe(event.id);
  });

  it('calls no model, whatever the rules read of it, and tells no app', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const before = world.scripted.received().length;
    const post = draftPost(world.postNumber(), { description: `${TIME_LINE}\n${PLACE_LINE}\n${linkTo(linked)}` });

    const signals = await signalsWhile(app, world.posts.watcher, 'global-events-changed', () =>
      world.collectedOf('snu_events', post),
    );

    expect(world.scripted.received()).toHaveLength(before);
    expect((await world.onlySession('snu_events', post)).globalEventId).toBe(event.id);
    expect(signals).toEqual([]);
  });

  it('is paired by number with a post of as many sessions', async () => {
    const linked = world.programme(world.uniqueTitle(), { sessions: sessionsOf(2) });
    await world.collectedOf('extra_snu', linked);
    const { sessions: events } = await world.sourcePostOf('extra_snu', linked);
    const post = world.snuPost('다른 제목', { description: linkTo(linked), sessions: sessionsOf(2) });

    await world.collectedOf('snu_events', post);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.map(({ globalEventId }) => globalEventId)).toEqual(
      events.map(({ globalEventId }) => globalEventId),
    );
  });
});

describe('A post that does not match its link one to one', () => {
  it.each([
    ['one session against two', 1, 2],
    ['two sessions against one', 2, 1],
  ])('stays Drafts held for the queue, unjudged and unpublished: %s', async (_case, own, others) => {
    const linked = world.programme(world.uniqueTitle(), { sessions: sessionsOf(others) });
    await world.collectedOf('extra_snu', linked);
    const before = world.scripted.received().length;
    const post = world.snuPost(world.uniqueTitle(), { description: linkTo(linked), sessions: sessionsOf(own) });

    await world.collectedOf('snu_events', post);

    const { sessions, stepFinishedAt } = await world.sourcePostOf('snu_events', post);
    expect(stepFinishedAt).not.toBeNull();
    expect(sessions).toMatchObject(
      Array.from({ length: own }, () => ({
        attachedBy: 'own',
        heldFor: 'link_not_one_to_one',
        globalEvent: { state: 'draft', publicationRoute: null },
      })),
    );
    expect(world.scripted.received()).toHaveLength(before);
  });

  it('stays a Draft when it links several stored posts', async () => {
    const [first, second] = [world.snuPost(world.uniqueTitle()), world.snuPost(world.uniqueTitle())];
    await world.collectedOf('snu_events', first, second);
    const post = world.programme(world.uniqueTitle(), { description: `${linkTo(first)}\n${linkTo(second)}` });

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject({
      heldFor: 'link_not_one_to_one',
      globalEvent: { state: 'draft' },
    });
  });

  it('is not judged: a model is not asked about a held Draft', async () => {
    const [first, second] = [world.snuPost(world.uniqueTitle()), world.snuPost(world.uniqueTitle())];
    await world.collectedOf('snu_events', first, second);
    const before = world.scripted.received().length;
    const post = draftPost(world.postNumber(), { description: `${TIME_LINE}\n${linkTo(first)}\n${linkTo(second)}` });

    await world.collectedOf('snu_events', post);

    expect(world.scripted.received()).toHaveLength(before);
    expect(await world.judgementOf(Number(post.key))).toBeNull();
    expect((await world.onlySession('snu_events', post)).globalEvent.state).toBe('draft');
  });
});

describe('The link rule, in other cases', () => {
  it('leaves the rest of the step to a post that links no stored post, or itself', async () => {
    const key = world.programmeKey();
    const address = world.programmeAddress(key);
    const post = world.programme(world.uniqueTitle(), {
      key,
      address,
      description: `${address}\nhttps://www.snu.ac.kr/snunow/events?md=v&bbsidx=1`,
    });

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject(PUBLISHED_OWN);
  });

  it('follows a linked post of the same message that is attached in its turn', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title));
    const linked = world.snuPost(title);
    const linking = world.snuPost('다른 제목', { description: linkTo(linked) });

    await world.collectedOf('snu_events', linked, linking);

    expect((await world.onlySession('snu_events', linked)).globalEventId).toBe(event.id);
    expect((await world.onlySession('snu_events', linking)).globalEventId).toBe(event.id);
  });
});

describe('Posts that link and fail', () => {
  it('comes before the title rule: a post goes to the event it links, not the one with its title', async () => {
    const title = world.uniqueTitle();
    const named = await world.publishedThrough('extra_snu', world.programme(title));
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.programme(title, { description: linkTo(linked) });

    await world.collectedOf('extra_snu', post);

    expect(await world.onlySession('extra_snu', post)).toMatchObject({ globalEventId: event.id, reason: 'link' });
    expect(event.id).not.toBe(named.id);
  });

  it('flags a programme over several days, whose time the post states, against another time', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.programme('다른 제목', { readFrom: null, start: '2027-05-01', description: linkTo(linked) });

    await world.collectedOf('extra_snu', post);

    expect((await world.stored(event.id)).needsAdministrator).toBe(true);
  });

});

describe('Posts that link each other, and a failure', () => {
  it('leaves two posts that link each other one event', async () => {
    const first = world.snuPost(world.uniqueTitle());
    const second = world.snuPost(world.uniqueTitle(), { description: linkTo(first) });
    first.description = linkTo(second);

    await world.collectedOf('snu_events', first, second);

    const sessions = [await world.onlySession('snu_events', first), await world.onlySession('snu_events', second)];
    expect(sessions[0].globalEventId).toBe(sessions[1].globalEventId);
    expect(sessions.map(({ attachedBy }) => attachedBy).toSorted()).toEqual(['own', 'rule']);
  });

  it('holds back a post it failed on until the next Collection', async () => {
    const linked = world.snuPost(world.uniqueTitle());
    const event = await world.publishedThrough('snu_events', linked);
    const post = world.snuPost('다른 제목', { description: linkTo(linked) });
    vi.spyOn(world.step, 'overLinks').mockRejectedValueOnce(new Error('The database went away'));

    await send(app, eventsMessage([post]));
    await vi.waitFor(
      async () => {
        expect((await world.sourcePostOf('snu_events', post)).stepFailure).not.toBeNull();
      },
      { timeout: 5000, interval: 20 },
    );
    expect(await world.onlySession('snu_events', post)).toMatchObject({ globalEvent: { state: 'draft' } });

    await world.nextCollection();
    await vi.waitFor(
      async () => {
        expect((await world.onlySession('snu_events', post)).globalEventId).toBe(event.id);
      },
      { timeout: 5000, interval: 20 },
    );
  });
});
