/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type PublicationStepService } from '../src/global-events/publication-step.service.js';
import { collectedPost, eventsMessage } from './global-events.js';
import { answer, answeredSession, draftPost, PLACE_LINE, TIME_LINE } from './judgements.js';
import { PLACE, PUBLISHED_OWN, type Post, SameEventWorld } from './same-event.js';
import { ScriptedModel } from './scripted-model.js';
import { signalsWhile } from './signals.js';
import { send } from './source-posts.js';
import { startApp } from './start-app.js';

const world = new SameEventWorld(988_000);
const JUDGED_START = '2026-11-05T14:00:00+09:00';

// A second pod on the same database, and a server with automatic publication off.
let otherPod: INestApplication<Server>;
let otherStep: PublicationStepService;
let notPublishing: INestApplication<Server>;

function judgedPost(title: string): Post {
  return draftPost(world.postNumber(), { title });
}

// Stores what `act` sends, with the step held back as a restart would leave it.
async function heldBack(act: () => Promise<void>, messages: number): Promise<void> {
  const held = vi.spyOn(world.step, 'run').mockResolvedValue();
  await act();
  await vi.waitFor(() => {
    expect(held).toHaveBeenCalledTimes(messages);
  });
  held.mockRestore();
}

beforeAll(async () => {
  await world.start();
  const silent = new ScriptedModel();
  otherPod = await startApp(
    { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on' },
    [],
    undefined,
    undefined,
    silent.model,
  );
  otherStep = otherPod.get((await import('../src/global-events/publication-step.service.js')).PublicationStepService);
  notPublishing = await startApp(
    { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on', AUTOMATIC_PUBLICATION: 'off' },
    [],
    undefined,
    undefined,
    world.scripted.model,
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.finishEveryPost();
});

afterAll(async () => {
  await notPublishing.close();
  await otherPod.close();
  await world.stop();
});

describe('A session a Judgement read', () => {
  it('is attached when the same event exists, and its Judgement names that event', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: JUDGED_START }));
    world.scripted.script(answer());
    const post = judgedPost(title);

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: event.id,
      attachedBy: 'rule',
      reason: 'equal_title_and_start',
      ownDraft: { title, startsAt: new Date(JUDGED_START).toISOString() },
    });
    expect((await world.judgementOf(Number(post.key)))?.sessions).toMatchObject([{ globalEventId: event.id }]);
    expect((await world.stored(event.id)).publicationRoute).toBe('rule');
  });

  it('is published as its own when no event matches', async () => {
    world.scripted.script(answer());
    const post = judgedPost(world.uniqueTitle());

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      globalEvent: { state: 'published', publicationRoute: 'judgement' },
    });
  });
});

describe('A session a Judgement could not read yet', () => {
  it('with its time still unknown stays a Draft, and is compared at the retry', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: JUDGED_START }));
    world.scripted.script({ error: new Error('The model went away') });
    const post = judgedPost(title);
    const postNumber = Number(post.key);

    await send(world.judging, eventsMessage([post]));
    await world.stepOver(postNumber);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      globalEvent: { state: 'draft', publicationRoute: null },
    });

    world.scripted.script(answer());
    await world.nextCollection();
    await world.finished(postNumber);

    expect((await world.onlySession('snu_events', post)).globalEventId).toBe(event.id);
  });
});

describe('A session the rules read, attached at the first try', () => {
  it('is no new session at the retry when the rules read it and it went to an event at the first try', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: JUDGED_START }));
    world.scripted.script({ error: new Error('The model went away') });
    const postNumber = world.postNumber();
    const post = collectedPost(postNumber, {
      title,
      description: `${TIME_LINE}\n${PLACE_LINE}`,
      sessions: [
        { number: 1, start: JUDGED_START, end: null, readFrom: 'body', place: PLACE },
        { number: 2, start: null, end: null, readFrom: null, place: null },
      ],
    });

    await send(world.judging, eventsMessage([post]));
    // The try's failure is stored before the step goes on to the session the rules read.
    await vi.waitFor(
      async () => {
        expect((await world.sourcePostOf('snu_events', post)).sessions[0].globalEventId).toBe(event.id);
      },
      { timeout: 5000, interval: 20 },
    );

    world.scripted.script(answer([answeredSession()]));
    await world.nextCollection();
    await world.finished(postNumber);

    expect((await world.judgementOf(postNumber))?.sessions).toMatchObject([{ globalEventId: null, passed: false }]);
    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.filter(({ attachedBy }) => attachedBy === 'own')).toMatchObject([
      { number: 2, globalEvent: { state: 'draft' } },
    ]);
  });
});

describe('With automatic publication off', () => {
  it('stores what is attached, publishes nothing and tells no app', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('snu_events', world.snuPost(title));
    const attached = world.programme(title);
    const own = world.programme(world.uniqueTitle());

    const signals = await signalsWhile(notPublishing, world.posts.watcher, 'global-events-changed', () =>
      world.through(notPublishing, 'extra_snu', [attached, own]),
    );

    expect((await world.onlySession('extra_snu', attached)).globalEventId).toBe(event.id);
    expect(await world.onlySession('extra_snu', own)).toMatchObject({
      attachedBy: 'own',
      globalEvent: { state: 'draft', publicationRoute: null },
    });
    expect(signals).toEqual([]);
  });

  it('attaches the second of two new posts to the first, still a Draft', async () => {
    const title = world.uniqueTitle();
    const [first, second] = [world.snuPost(title), world.snuPost(title)];

    await world.through(notPublishing, 'snu_events', [first, second]);

    const own = await world.onlySession('snu_events', first);
    expect(own.globalEvent.state).toBe('draft');
    expect(await world.onlySession('snu_events', second)).toMatchObject({
      globalEventId: own.globalEventId,
      attachedBy: 'rule',
    });
  });
});

describe("A Judgement's session with automatic publication off", () => {
  it("stores the attachment of a Judgement's session", async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: JUDGED_START }));
    world.scripted.script(answer());
    const post = judgedPost(title);

    await world.through(notPublishing, 'snu_events', [post]);

    expect((await world.onlySession('snu_events', post)).globalEventId).toBe(event.id);
    expect(await world.judgementOf(Number(post.key))).toMatchObject({
      publishedAt: null,
      sessions: [{ globalEventId: event.id }],
    });
  });
});

describe('A post of one Draft with automatic publication off', () => {
  it('keeps a session that matches nothing when the other was attached and took the Draft', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: JUDGED_START }));
    const other = answeredSession({ start: '2026-11-05T17:00', end: '2026-11-05T18:00' });
    const line = '- 일시: 2026. 11. 5.(목) 14:00~16:00, 17:00~18:00';
    world.scripted.script(
      answer([
        answeredSession({ lines: { start: [line], end: [line], place: [PLACE_LINE] } }),
        { ...other, lines: { start: [line], end: [line], place: [PLACE_LINE] } },
      ]),
    );
    const post = draftPost(world.postNumber(), { title, description: `${line}\n${PLACE_LINE}` });

    await world.through(notPublishing, 'snu_events', [post]);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.map(({ attachedBy, globalEventId }) => [attachedBy, globalEventId === event.id])).toEqual([
      ['rule', true],
      ['own', false],
    ]);
    expect(sessions[1].globalEvent).toMatchObject({ state: 'draft', title });
    expect((await world.judgementOf(Number(post.key)))?.sessions).toMatchObject([
      { passed: true, globalEventId: event.id },
      { passed: true, globalEventId: sessions[1].globalEventId },
    ]);
  });
});

describe('Two servers at once', () => {
  it('publish one event of two posts of it, wherever each runs', async () => {
    const title = world.uniqueTitle();
    const [ofOne, ofOther] = [world.snuPost(title), world.programme(title)];
    await heldBack(async () => {
      await send(world.judging, eventsMessage([ofOne]));
      await send(world.judging, eventsMessage([ofOther], { source: 'extra_snu' }));
    }, 2);

    await Promise.all([world.step.run('snu_events'), otherStep.run('extra_snu')]);

    const [one, other] = [await world.onlySession('snu_events', ofOne), await world.onlySession('extra_snu', ofOther)];
    expect(one.globalEventId).toBe(other.globalEventId);
    expect((await world.stored(one.globalEventId)).state).toBe('published');
    expect([one.attachedBy, other.attachedBy].toSorted()).toEqual(['own', 'rule']);
  });

  it('go over one post once', async () => {
    const post = world.snuPost(world.uniqueTitle());
    await heldBack(() => send(world.judging, eventsMessage([post])), 1);

    await Promise.all([world.step.run('snu_events'), otherStep.run('snu_events')]);

    expect(await world.onlySession('snu_events', post)).toMatchObject(PUBLISHED_OWN);
  });
});
