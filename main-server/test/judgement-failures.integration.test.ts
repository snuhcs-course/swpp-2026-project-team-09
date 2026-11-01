/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Step } from './scripted-model.js';
import { eventsMessage, postNumbersFrom } from './global-events.js';
import { answer, draftPost, JudgementWorld } from './judgements.js';
import { send } from './source-posts.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(981_000);
const providerFailure: Step = { error: new Error('The provider failed') };

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

describe('A Judgement that could not be made', () => {
  it.each<[string, Step, string]>([
    ['a model error', providerFailure, 'Error'],
    ['an answer that is no JSON', { text: 'I think it is at 2' }, 'AI_NoObjectGeneratedError'],
    ['an answer off the schema', { text: '{"announcesEvent":"yes","sessions":[]}' }, 'AI_NoObjectGeneratedError'],
    ['a timeout', { stall: true }, 'TimeoutError: the time per message ran out'],
  ])(
    'publishes nothing on %s, and is tried once more at the next Collection, then not again',
    async (_, step, cause) => {
      world.scripted.script(step, step, answer());
      const postNumber = newPost();

      await world.collected(draftPost(postNumber));

      expect((await world.onlyEvent(postNumber)).state).toBe('draft');
      expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'failed', attempts: 1, failure: cause });
      expect((await world.sourcePost(postNumber)).stepFinishedAt).toBeNull();
      expect(world.scripted.received()).toHaveLength(1);

      await world.nextCollection();
      await world.finished(postNumber);

      expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'failed', attempts: 2, failure: cause });
      expect(world.scripted.received()).toHaveLength(2);
      expect((await world.onlyEvent(postNumber)).state).toBe('draft');

      await world.nextCollection();
      await world.finished(postNumber);
      expect(world.scripted.received()).toHaveLength(2);
    },
  );
});

describe('The second try', () => {
  it('publishes when it passes', async () => {
    world.scripted.script(providerFailure, answer());
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));
    await world.nextCollection();
    await world.finished(postNumber);

    expect(await world.onlyEvent(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'judgement' });
    expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'judged', attempts: 2, failure: null });
  });

  it('records the error by its name, never what it holds of the request', async () => {
    world.scripted.script({ error: new Error('office@snu.ac.kr was in the request') });
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));

    expect((await world.judgementOf(postNumber))?.failure).toBe('Error');
  });
});

describe('Two servers', () => {
  it('make one call for one Draft', async () => {
    world.scripted.script(answer(), answer());
    const postNumber = newPost();
    const { id } = await world.leftBeforeTheStep(postNumber);

    await Promise.all([world.judgements.judgePost(id), world.judgements.judgePost(id)]);

    expect(world.scripted.received()).toHaveLength(1);
    expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'judged', attempts: 1 });
  });
});

describe('A server that died during the call', () => {
  it('has used its try, and its claim is taken up only once it is old', async () => {
    world.scripted.script(answer());
    const postNumber = newPost();
    const { id } = await world.leftBeforeTheStep(postNumber);
    await world.prisma.judgement.create({ data: { sourcePostId: id, attempts: 1, claimedAt: new Date() } });

    await world.judgements.judgePost(id);
    expect(world.scripted.received()).toEqual([]);

    const old = new Date(Date.now() - 60_000);
    await world.prisma.judgement.update({ where: { sourcePostId: id }, data: { claimedAt: old } });
    await world.judgements.judgePost(id);

    expect(world.scripted.received()).toHaveLength(1);
    expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'judged', attempts: 2 });
  });

  it('on the second try leaves a Judgement that could not be made, with no call', async () => {
    world.scripted.script();
    const postNumber = newPost();
    const { id } = await world.leftBeforeTheStep(postNumber);
    const old = new Date(Date.now() - 60_000);
    await world.prisma.judgement.create({ data: { sourcePostId: id, attempts: 2, claimedAt: old } });

    await world.nextCollection();
    await world.finished(postNumber);

    expect(world.scripted.received()).toEqual([]);
    expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'failed', attempts: 2 });
  });
});

describe('A failure after the answer', () => {
  it('publishes from the stored Judgement at the next Collection, with no second call', async () => {
    world.scripted.script(answer());
    vi.spyOn(world.step, 'publishPost').mockRejectedValueOnce(new Error('The database went away'));
    const postNumber = newPost();

    await send(world.judging, eventsMessage([draftPost(postNumber)]));
    await vi.waitFor(async () => {
      expect((await world.sourcePost(postNumber)).stepFailure).toBe('Error');
    });
    expect((await world.onlyEvent(postNumber)).state).toBe('draft');

    await world.nextCollection();
    await world.finished(postNumber);

    expect((await world.onlyEvent(postNumber)).state).toBe('published');
    expect(world.scripted.received()).toHaveLength(1);
    expect(await world.sourcePost(postNumber)).toMatchObject({ stepFailure: null, stepFailedAt: null });
  });
});
