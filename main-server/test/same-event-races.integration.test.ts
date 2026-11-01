/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { type PublicationStepService } from '../src/global-events/publication-step.service.js';
import { collectedPost, eventsMessage } from './global-events.js';
import { answer, PLACE_LINE, TIME_LINE } from './judgements.js';
import { PLACE, type Post, START } from './same-event.js';
import { DIFFERENT, QueueWorld, SAME } from './same-event-queue.js';
import { ScriptedModel } from './scripted-model.js';
import { send } from './source-posts.js';
import { startApp } from './start-app.js';

const world = new QueueWorld(992_000);

// A pod with another model on the same database.
const otherModel = new ScriptedModel();
let otherPod: INestApplication<Server>;
let otherStep: PublicationStepService;

// An event already published, and a new post of another title at its start: the rules leave it to the AI.
async function withCandidate(): Promise<{ eventId: string; post: Post }> {
  const event = await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()));
  return { eventId: event.id, post: world.snuPost(world.uniqueTitle()) };
}

// Stored, with the step held back; `run` then goes over it.
async function stored(post: Post): Promise<void> {
  const held = vi.spyOn(world.step, 'run').mockResolvedValue();
  await send(world.judging, eventsMessage([post]));
  await vi.waitFor(() => {
    expect(held).toHaveBeenCalled();
  });
  held.mockRestore();
}

beforeAll(async () => {
  await world.start();
  otherPod = await startApp(
    { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on', SAME_EVENT_TITLE_RULE: 'on', SAME_EVENT_AI_CHOICE: 'on' },
    [],
    undefined,
    undefined,
    otherModel.model,
  );
  otherStep = otherPod.get((await import('../src/global-events/publication-step.service.js')).PublicationStepService);
});

// Each test starts with no event near its own.
afterEach(async () => {
  vi.restoreAllMocks();
  await world.clear();
});

afterAll(async () => {
  await otherPod.close();
  await world.stop();
});

describe('Two servers', () => {
  it('makes one call for one post, and one of them settles it', async () => {
    const { eventId, post } = await withCandidate();
    await stored(post);
    world.scripted.script(SAME);
    otherModel.script(SAME);

    await Promise.all([world.step.run('snu_events'), otherStep.run('snu_events')]);

    const session = await world.onlySession('snu_events', post);
    expect(session).toMatchObject({ globalEventId: eventId, attachedBy: 'ai' });
    expect(world.scripted.received().length + otherModel.received().length).toBe(1);
  });
});

describe('The answer under the lock', () => {
  it('holds a session when its chosen event went while the model answered', async () => {
    const { eventId, post } = await withCandidate();
    world.scripted.script(SAME);
    const step = world.step;
    const publishPost = step.publishPost.bind(step);
    vi.spyOn(step, 'publishPost').mockImplementation(async (id) => {
      await world.prisma.globalEvent.delete({ where: { id: eventId } });
      return publishPost(id);
    });

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      heldFor: 'candidates_changed',
      globalEvent: { state: 'draft' },
    });
  });

  it('holds a session when an event it was not asked about came while the model answered', async () => {
    const { post } = await withCandidate();
    world.scripted.script(DIFFERENT);
    const step = world.step;
    const publishPost = step.publishPost.bind(step);
    const spy = vi.spyOn(step, 'publishPost').mockImplementation(async (id) => {
      spy.mockRestore();
      await world.prisma.globalEvent.create({
        data: { title: '다른 서버의 행사', description: '', startsAt: new Date(START), state: 'published' },
      });
      return publishPost(id);
    });

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      heldFor: 'candidates_changed',
      globalEvent: { state: 'draft' },
    });
  });
});

describe('Another server asking', () => {
  it('leaves a post alone while another server asks, and takes a call left by a stopped server as failed', async () => {
    const { post } = await withCandidate();
    await stored(post);
    const session = await world.onlySession('snu_events', post);
    const { startsAt } = session.globalEvent;
    if (startsAt === null) {
      throw new Error('The post has a start');
    }
    const claim = await world.prisma.sameEventAnswer.create({
      data: { sourcePostId: session.sourcePostId, startsAt, askedEventIds: [], claimedAt: new Date() },
    });
    world.scripted.script();

    await world.step.run('snu_events');

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      heldFor: null,
      globalEvent: { state: 'draft' },
    });
    expect((await world.sourcePostOf('snu_events', post)).stepFinishedAt).toBeNull();

    await world.prisma.sameEventAnswer.update({ where: { id: claim.id }, data: { claimedAt: new Date(0) } });
    await world.step.run('snu_events');

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      heldFor: 'ai_failed',
      globalEvent: { state: 'draft' },
    });
    expect((await world.sourcePostOf('snu_events', post)).stepFinishedAt).not.toBeNull();
    expect(world.scripted.received()).toHaveLength(0);
  });
});

describe('One event and a post', () => {
  it('holds both of two sessions at one start, since one answer cannot say which it means', async () => {
    const event = await world.publishedThrough('extra_snu', world.programme(world.uniqueTitle()));
    const post = collectedPost(world.postNumber(), {
      title: world.uniqueTitle(),
      description: '본문',
      sessions: [
        { number: 1, start: START, end: null, readFrom: 'body', place: PLACE },
        { number: 2, start: START, end: null, readFrom: 'body', place: '제1공학관(301동)' },
      ],
    });
    world.scripted.script(SAME);

    await world.collectedOf('snu_events', post);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.map(({ attachedBy, heldFor }) => [attachedBy, heldFor])).toEqual([
      ['own', 'several_matches'],
      ['own', 'several_matches'],
    ]);
    expect(await world.prisma.sourcePostSession.count({ where: { globalEventId: event.id } })).toBe(1);
    expect(world.sentToTheModel()).toContain('제1공학관(301동)');
    expect(world.scripted.received()).toHaveLength(1);
  });
});

describe('One event, the AI and the title rule', () => {
  const NEXT_DAY = '2027-03-11T14:00:00+09:00';

  it.each([
    ['the AI first', [START, NEXT_DAY], ['ai', 'own'], [null, 'several_matches']],
    ['the title rule first', [NEXT_DAY, START], ['rule', 'own'], [null, 'several_matches']],
  ])('takes one session of a post with %s, and the other waits', async (_, starts, attached, held) => {
    const title = world.uniqueTitle();
    const event = await world.publishedThrough('extra_snu', world.programme(title, { start: NEXT_DAY }));
    const post = collectedPost(world.postNumber(), {
      title,
      description: '본문',
      sessions: starts.map((start, index) => ({
        number: index + 1,
        start,
        end: null,
        readFrom: 'body',
        place: PLACE,
      })),
    });
    world.scripted.script(SAME);

    await world.collectedOf('snu_events', post);

    const { sessions } = await world.sourcePostOf('snu_events', post);
    expect(sessions.map(({ attachedBy }) => attachedBy)).toEqual(attached);
    expect(sessions.map(({ heldFor }) => heldFor)).toEqual(held);
    expect(sessions[0].globalEventId).toBe(event.id);
  });
});

describe('A run over a Draft', () => {
  it('asks nothing about the sessions the rules read', async () => {
    const { post: changes } = await withCandidate();
    const post = collectedPost(Number(changes.key), {
      title: changes.title,
      description: `${TIME_LINE}\n${PLACE_LINE}`,
      sessions: [
        { number: 1, start: START, end: null, readFrom: 'body', place: PLACE },
        { number: 2, start: null, end: null, readFrom: null, place: null },
      ],
    });
    await stored(post);
    const { sessions } = await world.sourcePostOf('snu_events', post);
    world.scripted.script(answer());

    await world.step.overDraft(sessions[1].globalEventId);

    expect(world.scripted.received()).toHaveLength(1);
    expect(await world.prisma.sameEventAnswer.count({ where: { sourcePostId: sessions[0].sourcePostId } })).toBe(0);
  });
});
