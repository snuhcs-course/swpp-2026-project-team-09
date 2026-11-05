/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { collectedPost } from './global-events.js';
import { answer, answeredSession, draftPost, PLACE_LINE } from './judgements.js';
import { linkTo, PLACE, type Post, START } from './same-event.js';
import { chose, DIFFERENT, LATER, QueueWorld, SAME, UNSURE } from './same-event-queue.js';
import { signalsWhile } from './signals.js';
import { startApp } from './start-app.js';

const world = new QueueWorld(991_000);

// A server that does not publish, and one with the choice off.
let notPublishing: INestApplication<Server>;
let turnedOff: INestApplication<Server>;

// An event already published, and a new post of another title at its start: the rules leave it to the AI.
async function withCandidate(): Promise<{ eventId: string; post: Post }> {
  const event = await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()));
  return { eventId: event.id, post: world.snuPost(world.uniqueTitle()) };
}

beforeAll(async () => {
  await world.start();
  const settings = { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on', SAME_EVENT_TITLE_RULE: 'on' };
  notPublishing = await startApp(
    { ...settings, SAME_EVENT_AI_CHOICE: 'on', AUTOMATIC_PUBLICATION: 'off' },
    [],
    undefined,
    undefined,
    world.scripted.model,
  );
  turnedOff = await startApp(settings, [], undefined, undefined, world.scripted.model);
});

// Each test starts with no event near its own.
afterEach(async () => {
  vi.restoreAllMocks();
  await world.clear();
});

afterAll(async () => {
  await turnedOff.close();
  await notPublishing.close();
  await world.stop();
});

describe('The AI chooses a candidate', () => {
  it('attaches the session with its reason, removes its Draft and tells no app', async () => {
    const { eventId, post } = await withCandidate();
    const before = await world.stored(eventId);
    world.scripted.script(SAME);

    const signals = await signalsWhile(turnedOff, world.posts.watcher, 'global-events-changed', () =>
      world.collectedOf('snu_events', post),
    );

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: eventId,
      attachedBy: 'ai',
      reason: '같은 행사입니다',
      heldFor: null,
      ownDraft: { title: post.title },
    });
    expect(await world.stored(eventId)).toMatchObject({ version: before.version, needsAdministrator: false });
    expect(signals).toEqual([]);
  });
});

describe('The AI chooses a candidate at another time, or for a Judgement', () => {
  it('flags the event when it gives another time, and changes nothing else', async () => {
    const event = await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()));
    const post = world.snuPost(world.uniqueTitle(), { start: '2027-03-11T14:00:00+09:00' });
    world.scripted.script(SAME);

    await world.collectedOf('snu_events', post);

    expect((await world.onlySession('snu_events', post)).attachedBy).toBe('ai');
    expect(await world.stored(event.id)).toMatchObject({
      needsAdministrator: true,
      version: event.version,
      startsAt: event.startsAt,
    });
  });

  it('attaches a session a Judgement read', async () => {
    const event = await world.publishedThrough(
      'extra_snu',
      world.programme(world.uniqueTitle(), { start: '2076-11-05T14:00:00+09:00' }),
    );
    const post = draftPost(world.postNumber(), { title: world.uniqueTitle() });
    world.scripted.script(answer(), SAME);

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({ globalEventId: event.id, attachedBy: 'ai' });
    expect((await world.judgementOf(Number(post.key)))?.sessions).toMatchObject([{ globalEventId: event.id }]);
    expect(world.scripted.received()).toHaveLength(2);
  });
});

describe('The AI chooses none', () => {
  it('publishes the session as its own', async () => {
    const { post } = await withCandidate();
    world.scripted.script(DIFFERENT);

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      heldFor: null,
      globalEvent: { state: 'published', publicationRoute: 'rule' },
    });
  });
});

describe('The queue', () => {
  it.each([
    ['unsure', UNSURE, 'ai_unsure'],
    ['a failed call', { error: new Error('The model went away') }, 'ai_failed'],
    ['a timeout', { stall: true as const }, 'ai_failed'],
    ['a malformed answer', { text: 'no json' }, 'ai_failed'],
    ['a candidate not listed', chose({ answer: 'same', candidate: 40 }), 'ai_failed'],
  ])('takes a session on %s, publishing nothing, and the next Collection asks nothing', async (_, step, heldFor) => {
    const { post } = await withCandidate();
    world.scripted.script(step);

    await world.collectedOf('snu_events', post);

    const session = await world.onlySession('snu_events', post);
    expect(session).toMatchObject({ attachedBy: 'own', heldFor, globalEvent: { state: 'draft', version: 1 } });
    expect((await world.queue()).map(({ sessionId }) => sessionId)).toContain(session.id);
    expect(world.scripted.received()).toHaveLength(1);

    world.scripted.script();
    await world.nextCollection();
    await world.collectedOf('snu_events', world.snuPost(world.uniqueTitle(), { start: '2027-06-01T14:00:00+09:00' }));

    expect(world.scripted.received()).toHaveLength(0);
  });
});

describe('The queue, for two sessions', () => {
  it('takes both sessions of a post that chose one event', async () => {
    const event = await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()));
    const post = collectedPost(world.postNumber(), {
      title: world.uniqueTitle(),
      description: '본문',
      sessions: [
        { number: 1, start: START, end: null, readFrom: 'body', place: PLACE },
        { number: 2, start: '2027-03-11T14:00:00+09:00', end: null, readFrom: 'body', place: PLACE },
      ],
    });
    world.scripted.script({
      text: JSON.stringify({
        sessions: [1, 2].map((session) => ({ session, answer: 'same', candidate: 1, reason: '같음' })),
      }),
    });

    await world.collectedOf('snu_events', post);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.map(({ heldFor, globalEventId }) => [heldFor, globalEventId === event.id])).toEqual([
      ['several_matches', false],
      ['several_matches', false],
    ]);
    expect(world.scripted.received()).toHaveLength(1);
  });
});

describe('Asking', () => {
  it('sends only the candidates the refusing rules leave, and masked', async () => {
    const shared = world.uniqueTitle();
    const kept = await world.publishedThrough(
      'extra_snu',
      world.programme(`${shared} 대면`, { description: '담당 office@snu.ac.kr' }),
    );
    await world.publishedThrough('extra_snu', world.programme(`${shared} 비대면 안내문`));
    const post = world.snuPost(`${world.uniqueTitle()} 대면`);
    world.scripted.script(DIFFERENT);

    await world.collectedOf('snu_events', post);

    const sent = world.sentToTheModel();
    expect(sent).toContain(`${shared} 대면`);
    expect(sent).not.toContain('비대면 안내문');
    expect(sent).not.toContain('office@snu.ac.kr');
    expect(sent).not.toContain(kept.id);
  });

  it('asks nothing of a post with no candidate, or one the title rule decides', async () => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough(
      'extra_snu',
      world.programme(title, { start: '2027-05-01T14:00:00+09:00' }),
    );
    const same = world.snuPost(title, { start: '2027-05-01T14:00:00+09:00' });
    const alone = world.snuPost(world.uniqueTitle(), { start: '2027-07-01T14:00:00+09:00' });
    world.scripted.script();

    await world.collectedOf('snu_events', same, alone);

    expect(await world.onlySession('snu_events', same)).toMatchObject({ globalEventId: event.id, attachedBy: 'rule' });
    expect((await world.onlySession('snu_events', alone)).globalEvent.state).toBe('published');
    expect(world.scripted.received()).toHaveLength(0);
  });

  it('asks nothing of a post the link rule decided', async () => {
    const linked = world.programme(world.uniqueTitle());
    await world.publishedThrough('extra_snu', linked);
    const post = world.snuPost(world.uniqueTitle(), { description: linkTo(linked) });
    world.scripted.script();

    await world.collectedOf('snu_events', post);

    expect((await world.onlySession('snu_events', post)).attachedBy).toBe('rule');
    expect(world.scripted.received()).toHaveLength(0);
  });
});

describe('With automatic publication off', () => {
  it('stores what the AI chose and publishes nothing', async () => {
    const { eventId, post } = await withCandidate();
    const none = world.snuPost(world.uniqueTitle(), { start: LATER });
    await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle(), { start: LATER }));
    world.scripted.script(SAME, DIFFERENT);

    const signals = await signalsWhile(turnedOff, world.posts.watcher, 'global-events-changed', async () => {
      await world.through(notPublishing, 'snu_events', [post]);
      await world.through(notPublishing, 'snu_events', [none]);
    });

    expect(await world.onlySession('snu_events', post)).toMatchObject({ globalEventId: eventId, attachedBy: 'ai' });
    expect(await world.onlySession('snu_events', none)).toMatchObject({
      attachedBy: 'own',
      heldFor: null,
      globalEvent: { state: 'draft' },
    });
    expect(signals).toEqual([]);
  });
});

describe('Turned off', () => {
  it('asks nothing, stores no answer and publishes both, as without the AI', async () => {
    const { post } = await withCandidate();
    world.scripted.script();

    await world.through(turnedOff, 'snu_events', [post]);

    const session = await world.onlySession('snu_events', post);
    expect(session).toMatchObject({ attachedBy: 'own', heldFor: null, globalEvent: { state: 'published' } });
    expect(world.scripted.received()).toHaveLength(0);
    expect(await world.prisma.sameEventAnswer.count({ where: { sourcePostId: session.sourcePostId } })).toBe(0);
  });
});

describe('A Judgement of several sessions', () => {
  it('asks once for the post, about the sessions with candidates', async () => {
    const event = await world.publishedThrough(
      'extra_snu',
      world.programme(world.uniqueTitle(), { start: '2076-11-05T14:00:00+09:00' }),
    );
    const line = '- 일시: 2076. 11. 5.(목) 14:00~16:00, 2076. 12. 5.(토) 14:00~16:00';
    const post = draftPost(world.postNumber(), { title: world.uniqueTitle(), description: `${line}\n${PLACE_LINE}` });
    const lines = { start: [line], end: [line], place: [PLACE_LINE] };
    world.scripted.script(
      answer([
        answeredSession({ lines }),
        answeredSession({ start: '2076-12-05T14:00', end: '2076-12-05T16:00', lines }),
      ]),
      SAME,
    );

    await world.collectedOf('snu_events', post);

    expect(world.scripted.received()).toHaveLength(2);
    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.find(({ attachedBy }) => attachedBy === 'ai')?.globalEventId).toBe(event.id);
    expect(sessions.find(({ attachedBy }) => attachedBy === 'own')?.globalEvent.state).toBe('published');
  });
});
