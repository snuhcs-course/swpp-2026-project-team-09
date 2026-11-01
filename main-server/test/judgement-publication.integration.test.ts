/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { collectedPost, eventsMessage, postNumbersFrom } from './global-events.js';
import { answer, answeredSession, draftPost, JudgementWorld, PLACE, PLACE_LINE, TIME_LINE } from './judgements.js';
import { signalsWhile } from './signals.js';
import { eventsOf, send } from './source-posts.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(980_000);

beforeAll(async () => {
  await world.start();
});

afterEach(async () => {
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

describe('A Judgement that passes', () => {
  it('publishes the Draft with its values, the route and version 1, and tells the apps', async () => {
    world.scripted.script(answer());
    const postNumber = newPost();

    const signals = await signalsWhile(world.judging, world.posts.watcher, 'global-events-changed', async () => {
      await world.collected(draftPost(postNumber));
      await vi.waitFor(() => {
        expect(world.posts.watcher.all().at(-1)?.name).toBe('global-events-changed');
      });
    });

    expect(signals).toEqual([{ name: 'global-events-changed' }]);
    const event = await world.onlyEvent(postNumber);
    expect(event).toMatchObject({
      state: 'published',
      publicationRoute: 'judgement',
      version: 1,
      startsAt: new Date('2026-11-05T14:00:00+09:00'),
      endsAt: new Date('2026-11-05T16:00:00+09:00'),
      place: PLACE,
    });
    expect(event.latitude).not.toBeNull();
    expect(event.longitude).not.toBeNull();
    expect(world.scripted.received()).toHaveLength(1);
  });
});

describe('A stored Judgement', () => {
  it('holds the values, the lines, each check, the model and the time', async () => {
    world.scripted.script(answer());
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));

    const { id } = await world.onlyEvent(postNumber);
    const judgement = await world.judgementRead(id);
    expect(judgement).toMatchObject({
      outcome: 'judged',
      failure: null,
      attempts: 1,
      announcesEvent: true,
      modelId: 'scripted',
    });
    expect(judgement.judgedAt).not.toBeNull();
    expect(judgement.sessions).toMatchObject([
      {
        start: '2026-11-05T14:00',
        place: PLACE,
        lines: { start: [TIME_LINE], end: [TIME_LINE], place: [PLACE_LINE] },
        passed: true,
        globalEventId: id,
      },
    ]);
    expect(judgement.sessions[0]?.checks.every(({ passed }) => passed)).toBe(true);
  });
});

describe('What is sent to the model', () => {
  it('is masked, and keeps its dates and times', async () => {
    world.scripted.script(answer());

    await world.collected(draftPost(newPost()));

    const sent = world.sentToTheModel();
    expect(sent).toContain('[이메일]');
    expect(sent).toContain('[전화번호]');
    expect(sent).not.toContain('office@snu.ac.kr');
    expect(sent).not.toContain('880-1234');
    expect(sent).toContain('2026. 11. 5.(목) 14:00~16:00');
  });

  it('is nothing when the rules read the post', async () => {
    world.scripted.script();
    const postNumber = newPost();

    await world.collected(collectedPost(postNumber));

    expect(world.scripted.received()).toEqual([]);
    expect(await world.judgementOf(postNumber)).toBeNull();
    expect(await world.onlyEvent(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'rule' });
  });
});

describe('A session that does not pass', () => {
  it('stays a Draft with the failed check recorded', async () => {
    world.scripted.script(answer([answeredSession({ start: '2026-11-06T14:00', end: '2026-11-06T16:00' })]));
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));

    const event = await world.onlyEvent(postNumber);
    expect(event).toMatchObject({ state: 'draft', publicationRoute: null });
    const { sessions } = await world.judgementRead(event.id);
    expect(sessions[0]?.checks.filter(({ passed }) => !passed)).toEqual([{ name: 'dateAgrees', passed: false }]);
  });

  it('stays a Draft marked so when the post is called no event, and is not tried again', async () => {
    world.scripted.script(answer([], false));
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));

    expect((await world.onlyEvent(postNumber)).state).toBe('draft');
    expect(await world.judgementOf(postNumber)).toMatchObject({
      outcome: 'no_event',
      announcesEvent: false,
      attempts: 1,
    });
    expect((await world.sourcePost(postNumber)).stepFinishedAt).not.toBeNull();
  });
});

describe('Another Source', () => {
  it('is read the same, with its setting for a building number alone', async () => {
    const place = '132동 103호';
    world.scripted.script(
      answer([answeredSession({ place, lines: { start: [TIME_LINE], end: [TIME_LINE], place: [place] } })]),
    );
    const key = String(newPost());
    const post = draftPost(Number(key), {
      address: `https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`,
      description: `${TIME_LINE}\n${place}`,
    });

    await send(world.judging, eventsMessage([post], { source: 'extra_snu' }));

    await vi.waitFor(async () => {
      const [event] = await eventsOf(world.prisma, key, 'extra_snu');
      expect(event).toMatchObject({ state: 'published', publicationRoute: 'judgement' });
    });
  });
});
