/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { changeState, patchGlobalEvent } from './global-event-changes.js';
import { postNumbersFrom } from './global-events.js';
import {
  answer,
  answeredSession,
  draftPost,
  JudgementWorld,
  PLACE_LINE,
  TIME_LINE,
  type AnsweredSession,
} from './judgements.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(982_000);

const SECOND_LINE = '- 2회차: 2026. 11. 12.(목) 14:00~16:00';
const THIRD_LINE = '- 3회차: 2026. 11. 19.(목) 14:00~16:00';
const LINES = `${TIME_LINE}\n${SECOND_LINE}\n${THIRD_LINE}\n${PLACE_LINE}`;

function second(): AnsweredSession {
  return answeredSession({
    start: '2026-11-12T14:00',
    end: '2026-11-12T16:00',
    lines: { start: [SECOND_LINE], end: [SECOND_LINE], place: [PLACE_LINE] },
  });
}

// Its place is on no line of the post, so it fails.
function failingThird(): AnsweredSession {
  return answeredSession({
    start: '2026-11-19T14:00',
    end: '2026-11-19T16:00',
    place: '온라인',
    lines: { start: [THIRD_LINE], end: [THIRD_LINE], place: [PLACE_LINE] },
  });
}

function session(number: number, start: string, readFrom: string, place: string | null): object {
  return { number, start, end: null, readFrom, place };
}

beforeAll(async () => {
  await world.start();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

describe('A post stored as one Draft', () => {
  it('makes each passing session its own event, and the Draft stays for the failing one', async () => {
    world.scripted.script(answer([answeredSession(), second(), failingThird()]));
    const postNumber = newPost();

    await world.collected(draftPost(postNumber, { description: LINES }));

    const events = await world.eventsOf(postNumber);
    expect(events.filter(({ state }) => state === 'draft')).toHaveLength(1);
    const published = events.filter(({ state }) => state === 'published');
    expect(
      published.map(({ startsAt }) => startsAt?.toISOString() ?? '').toSorted((a, b) => a.localeCompare(b)),
    ).toEqual(['2026-11-05T05:00:00.000Z', '2026-11-12T05:00:00.000Z']);
    expect(published.every(({ publicationRoute, version }) => publicationRoute === 'judgement' && version === 1)).toBe(
      true,
    );
    const sessions = await world.prisma.sourcePostSession.findMany({
      where: { sourcePost: { key: String(postNumber) } },
      orderBy: { number: 'asc' },
    });
    expect(sessions.map(({ number, attachedBy }) => [number, attachedBy])).toEqual([
      [1, 'own'],
      [2, 'own'],
      [3, 'own'],
    ]);
  });

  it('uses the Draft for a session when all pass, leaving no Draft', async () => {
    world.scripted.script(answer([answeredSession(), second()]));
    const postNumber = newPost();

    await world.collected(draftPost(postNumber, { description: LINES }));

    const events = await world.eventsOf(postNumber);
    expect(events.map(({ state }) => state)).toEqual(['published', 'published']);
  });
});

describe('A post stored with a Draft per session', () => {
  it('takes one call, publishes the Drafts whose sessions passed, and keeps the other as the worker read it', async () => {
    world.scripted.script(answer([answeredSession(), second(), failingThird()]));
    const postNumber = newPost();
    const sessions = [
      session(1, '2026-11-05T14:00:00+09:00', 'header', null),
      session(2, '2026-11-12T14:00:00+09:00', 'header', null),
      session(3, '2026-11-19T14:00:00+09:00', 'header', '어디'),
    ];

    await world.collected({ ...draftPost(postNumber, { description: LINES }), sessions });

    expect(world.scripted.received()).toHaveLength(1);
    const events = await world.eventsOf(postNumber);
    expect(events).toHaveLength(3);
    expect(events.filter(({ state }) => state === 'published')).toHaveLength(2);
    expect(events.find(({ state }) => state === 'draft')).toMatchObject({
      place: '어디',
      startsAt: new Date('2026-11-19T14:00:00+09:00'),
    });
  });

  it('does not publish again a session the rules read', async () => {
    world.scripted.script(answer([answeredSession(), second()]));
    const postNumber = newPost();
    const sessions = [
      session(1, '2026-11-05T14:00:00+09:00', 'body', PLACE_LINE.replace('- 장소: ', '')),
      session(2, '2026-11-12T14:00:00+09:00', 'header', null),
    ];

    await world.collected({ ...draftPost(postNumber, { description: LINES }), sessions });

    const routes = (await world.eventsOf(postNumber)).map(({ publicationRoute }) => publicationRoute ?? '');
    expect(routes.toSorted((a, b) => a.localeCompare(b))).toEqual(['judgement', 'rule']);
  });
});

describe('A Draft an Administrator changed', () => {
  it('is never judged', async () => {
    world.scripted.script();
    const postNumber = newPost();
    await world.leftBeforeTheStep(postNumber);
    const { id, version } = await world.onlyEvent(postNumber);
    await patchGlobalEvent(world.judging, world.administrator, id, { version, title: '설명회 (수정)' }).expect(200);

    await world.nextCollection();
    await world.finished(postNumber);

    expect(world.scripted.received()).toEqual([]);
    expect(await world.judgementOf(postNumber)).toBeNull();
    expect(await world.onlyEvent(postNumber)).toMatchObject({ state: 'draft', title: '설명회 (수정)' });
  });

  it('that was discarded is never judged', async () => {
    world.scripted.script();
    const postNumber = newPost();
    await world.leftBeforeTheStep(postNumber);
    const { id, version } = await world.onlyEvent(postNumber);
    await changeState(world.judging, world.administrator, id, 'discard', version);

    await world.nextCollection();
    await world.finished(postNumber);

    expect(world.scripted.received()).toEqual([]);
    expect((await world.onlyEvent(postNumber)).state).toBe('discarded');
  });
});

describe('A Draft an Administrator changes later', () => {
  it('after a failed try is not tried again, and the step finishes with the post', async () => {
    world.scripted.script({ error: new Error('The provider failed') });
    const postNumber = newPost();
    await world.collected(draftPost(postNumber));
    const { id, version } = await world.onlyEvent(postNumber);
    await patchGlobalEvent(world.judging, world.administrator, id, { version, title: '설명회 (수정)' }).expect(200);

    await world.nextCollection();
    await world.finished(postNumber);

    expect(world.scripted.received()).toHaveLength(1);
  });

  it('while the model reads the post publishes nothing of that Judgement', async () => {
    const postNumber = newPost();
    await world.leftBeforeTheStep(postNumber);
    const { id, version } = await world.onlyEvent(postNumber);
    const judgePost = world.judgements.judgePost.bind(world.judgements);
    world.scripted.script(answer());
    vi.spyOn(world.judgements, 'judgePost').mockImplementation(async (sourcePostId) => {
      const judged = await judgePost(sourcePostId);
      await patchGlobalEvent(world.judging, world.administrator, id, { version, title: '설명회 (수정)' }).expect(200);
      return judged;
    });

    await world.nextCollection();
    await world.finished(postNumber);

    expect(await world.onlyEvent(postNumber)).toMatchObject({
      state: 'draft',
      title: '설명회 (수정)',
      publicationRoute: null,
    });
    expect((await world.judgementOf(postNumber))?.outcome).toBe('judged');
  });
});
