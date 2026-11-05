/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { storedSessions } from '../src/global-events/judgement-answer.js';
import { collectedPost } from './global-events.js';
import { answer, type AnsweredSession } from './judgements.js';
import { PLACE, type Post } from './same-event.js';
import { chose, DIFFERENT, QueueWorld, SAME, UNSURE } from './same-event-queue.js';
import { startApp } from './start-app.js';

// The sessions of a Judgement the server does not publish (ADR 0014): one whose place names no Place is still compared,
// and attached only on narrow terms; one whose time or place passes fills its Draft.

const world = new QueueWorld(996_000);
// A server with automatic publication off.
let notPublishing: INestApplication<Server>;

const START = '2085-11-05T14:00:00+09:00';
const NEXT_DAY = '2085-11-06T14:00:00+09:00';
const SAME_MORNING = '2085-11-05T10:00:00+09:00';
const TIME_LINE = '- 일시: 2085. 11. 5.(월) 14:00~16:00';
const NOWHERE = '마을 공방 2층 작업실';
const NOWHERE_LINE = `- 장소: ${NOWHERE}`;
const PLACE_LINE = `- 장소: ${PLACE}`;

// A post the rules leave a Draft at the header's date, with the lines a Judgement reads.
function judgedPost(title: string, placeLine = NOWHERE_LINE): Post {
  return collectedPost(world.postNumber(), {
    title,
    readFrom: 'header',
    start: '2085-11-05',
    place: null,
    description: `${TIME_LINE}\n${placeLine}`,
  });
}

function session(changes: Partial<AnsweredSession> = {}): AnsweredSession {
  return {
    start: '2085-11-05T14:00',
    end: '2085-11-05T16:00',
    place: NOWHERE,
    overPeriod: false,
    lines: { start: [TIME_LINE], end: [TIME_LINE], place: [NOWHERE_LINE] },
    ...changes,
  };
}

const UNPLACED = answer([session()]);

async function eventAt(title: string, start = START): Promise<string> {
  return (await world.publishedThrough('extra_snu', world.programme(title, { start }))).id;
}

async function failedChecks(post: Post): Promise<string[]> {
  const judgement = await world.judgementOf(Number(post.key));
  return storedSessions(judgement?.sessions ?? null)
    .flatMap(({ checks }) => checks.filter(({ passed }) => !passed))
    .map(({ name }) => name);
}

beforeAll(async () => {
  await world.start();
  notPublishing = await startApp(
    { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on', SAME_EVENT_TITLE_RULE: 'on', AUTOMATIC_PUBLICATION: 'off' },
    [],
    undefined,
    undefined,
    world.scripted.model,
  );
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.clear();
});

afterAll(async () => {
  await notPublishing.close();
  await world.stop();
});

describe('A session whose place names no Place, attached', () => {
  it('is attached by an equal title and start, without asking the AI', async () => {
    const title = world.uniqueTitle();
    const eventId = await eventAt(title);
    const post = judgedPost(title);
    world.scripted.script(UNPLACED);

    await world.collectedOf('snu_events', post);

    expect(await failedChecks(post)).toEqual(['placeMatches']);
    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: eventId,
      attachedBy: 'rule',
      reason: 'equal_title_and_start_without_place',
      ownDraft: { title, startsAt: new Date(START).toISOString(), place: null },
    });
    expect(world.scripted.received()).toHaveLength(1);
    expect((await world.judgementOf(Number(post.key)))?.sessions).toMatchObject([{ globalEventId: eventId }]);
  });

  it('is attached when the AI answers same, the start is equal to the minute and one title holds the other', async () => {
    const title = world.uniqueTitle();
    const eventId = await eventAt(title);
    const post = judgedPost(`${title} 참가 안내`);
    world.scripted.script(UNPLACED, SAME);

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      globalEventId: eventId,
      attachedBy: 'ai',
      reason: 'same_minute_and_contained_title',
    });
    expect(JSON.stringify(world.scripted.received()[1]?.prompt)).toContain(`place: ${NOWHERE}`);
  });
});

describe('A session whose place names no Place, held', () => {
  it.each([
    ['another minute', NEXT_DAY, (title: string): string => `${title} 참가 안내`],
    ['titles that do not hold one another', START, (): string => world.uniqueTitle()],
  ])('is held, not attached, when the AI answers same with %s', async (_, start, titleOf) => {
    const title = world.uniqueTitle();
    await eventAt(title, start);
    const post = judgedPost(titleOf(title));
    world.scripted.script(UNPLACED, SAME);

    await world.collectedOf('snu_events', post);

    const held = await world.onlySession('snu_events', post);
    expect(held).toMatchObject({ attachedBy: 'own', heldFor: 'place_unchecked', globalEvent: { state: 'draft' } });
    expect((await world.queue()).map(({ sessionId }) => sessionId)).toContain(held.id);
  });

  it.each([
    ['different', DIFFERENT, 'place_unchecked'],
    ['unsure', UNSURE, 'ai_unsure'],
  ])('is held when the AI answers %s, and never published', async (_, choice, heldFor) => {
    await eventAt(world.uniqueTitle());
    const post = judgedPost(world.uniqueTitle());
    world.scripted.script(UNPLACED, choice);

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      heldFor,
      globalEvent: { state: 'draft', publicationRoute: null, startsAt: new Date(START) },
    });
  });
});

describe('A session whose place names no Place, with no candidate', () => {
  it('is refused at another time on the same day without asking the AI, and stays a Draft', async () => {
    const title = world.uniqueTitle();
    await eventAt(title, SAME_MORNING);
    const post = judgedPost(title);
    world.scripted.script(UNPLACED, chose({ answer: 'same', candidate: 1 }));

    await world.collectedOf('snu_events', post);

    expect(world.scripted.received()).toHaveLength(1);
    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      heldFor: null,
      globalEvent: { state: 'draft' },
    });
  });

  it('with no candidate stays its own Draft with its time filled, out of the queue', async () => {
    const post = judgedPost(world.uniqueTitle());
    world.scripted.script(UNPLACED);

    await world.collectedOf('snu_events', post);

    const own = await world.onlySession('snu_events', post);
    expect(own).toMatchObject({
      attachedBy: 'own',
      heldFor: null,
      globalEvent: {
        state: 'draft',
        startsAt: new Date(START),
        endsAt: new Date('2085-11-05T16:00:00+09:00'),
        place: null,
        latitude: null,
      },
    });
    expect((await world.judgementOf(Number(post.key)))?.sessions).toMatchObject([{ globalEventId: own.globalEventId }]);
    expect(await world.queue()).toEqual([]);
  });
});

describe('A session whose place names no Place, detached', () => {
  it('attached on these terms can be detached', async () => {
    const title = world.uniqueTitle();
    const eventId = await eventAt(title);
    const post = judgedPost(title);
    world.scripted.script(UNPLACED);
    await world.collectedOf('snu_events', post);
    const { id } = await world.onlySession('snu_events', post);

    await world.admin('post', `/sessions/${id}/detach`).expect(204);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      globalEvent: { state: 'draft', title, startsAt: new Date(START) },
    });
    expect((await world.stored(eventId)).state).toBe('published');
  });
});

describe('A session whose time fails and whose place passes', () => {
  it('fills its Draft with the place, keeps the time the worker read, and is not compared', async () => {
    await eventAt(world.uniqueTitle());
    const post = judgedPost(world.uniqueTitle(), PLACE_LINE);
    world.scripted.script(
      answer([
        session({
          start: '2085-11-05T15:00',
          place: PLACE,
          lines: { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] },
        }),
      ]),
    );

    await world.collectedOf('snu_events', post);

    expect(await failedChecks(post)).toEqual(['timeAgrees']);
    const own = await world.onlySession('snu_events', post);
    expect(own).toMatchObject({
      attachedBy: 'own',
      heldFor: null,
      globalEvent: { state: 'draft', place: PLACE, startsAt: new Date('2085-11-05T00:00:00+09:00') },
    });
    expect(own.globalEvent.latitude).not.toBeNull();
    expect(world.scripted.received()).toHaveLength(1);
  });
});

describe('A session that passes every check', () => {
  it('is published as before', async () => {
    const post = judgedPost(world.uniqueTitle(), PLACE_LINE);
    world.scripted.script(
      answer([session({ place: PLACE, lines: { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] } })]),
    );

    await world.collectedOf('snu_events', post);

    expect(await world.onlySession('snu_events', post)).toMatchObject({
      attachedBy: 'own',
      globalEvent: { state: 'published', publicationRoute: 'judgement', place: PLACE, startsAt: new Date(START) },
    });
  });
});

describe('With automatic publication off', () => {
  it('keeps the Draft a compared session fills when a later run publishes the rest', async () => {
    const later = '- 일시: 2085. 11. 12.(월) 14:00~16:00';
    const post = collectedPost(world.postNumber(), {
      title: world.uniqueTitle(),
      readFrom: 'header',
      start: '2085-11-05',
      place: null,
      description: `${TIME_LINE}\n${later}\n${PLACE_LINE}\n${NOWHERE_LINE}`,
    });
    const placed = { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] };
    const unplaced = { start: [later], end: [later], place: [NOWHERE_LINE] };
    world.scripted.script(
      answer([
        session({ place: PLACE, lines: placed }),
        session({ start: '2085-11-12T14:00', end: '2085-11-12T16:00', lines: unplaced }),
      ]),
    );

    await world.through(notPublishing, 'snu_events', [post]);
    const [{ globalEventId: draftId }] = (await world.sourcePostOf('snu_events', post)).sessions;
    await world.step.overDraft(draftId);

    const sessions = (await world.sourcePostOf('snu_events', post)).sessions.map(({ globalEvent }) => globalEvent);
    expect(sessions).toMatchObject([
      { state: 'draft', startsAt: new Date('2085-11-12T14:00:00+09:00') },
      { state: 'published', startsAt: new Date(START), place: PLACE },
    ]);
  });
});
