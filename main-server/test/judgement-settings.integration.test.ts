/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { type JudgementsService } from '../src/global-events/judgements.service.js';
import { type PublicationStepService } from '../src/global-events/publication-step.service.js';
import { changeState } from './global-event-changes.js';
import { publishedAmong } from './global-event-lists.js';
import { collectedPost, eventsMessage, postNumbersFrom } from './global-events.js';
import { answer, draftPost, JudgementWorld } from './judgements.js';
import { ScriptedModel } from './scripted-model.js';
import { signalsWhile } from './signals.js';
import { signIn } from './sign-in.js';
import { send } from './source-posts.js';
import { startApp } from './start-app.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(983_000);

// A server that does not judge, on the same database.
let off: INestApplication<Server>;
let judgements: JudgementsService;
let step: PublicationStepService;
const silent = new ScriptedModel();

beforeAll(async () => {
  await world.start();
  off = await startApp({ ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'off' }, [], undefined, undefined, silent.model);
  judgements = off.get((await import('../src/global-events/judgements.service.js')).JudgementsService);
  step = off.get((await import('../src/global-events/publication-step.service.js')).PublicationStepService);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.finishEveryPost();
});

afterAll(async () => {
  await off.close();
  await world.stop();
});

describe('With automatic publication off', () => {
  it('stores the Judgement, publishes nothing and tells no app', async () => {
    const notPublishing = await startApp(
      { ...world.posts.settings, AUTOMATIC_JUDGEMENT: 'on', AUTOMATIC_PUBLICATION: 'off' },
      [],
      undefined,
      undefined,
      world.scripted.model,
    );
    world.scripted.script(answer());
    const postNumber = newPost();

    const signals = await signalsWhile(notPublishing, world.posts.watcher, 'global-events-changed', () =>
      world.collected(draftPost(postNumber), notPublishing),
    );
    await notPublishing.close();

    expect(signals).toEqual([]);
    expect(await world.onlyEvent(postNumber)).toMatchObject({ state: 'draft', publicationRoute: null, version: 1 });
    expect(await world.judgementOf(postNumber)).toMatchObject({ outcome: 'judged', publishedAt: null });
  });
});

async function storedDraft(): Promise<{ postNumber: number; id: string }> {
  const postNumber = newPost();
  await send(off, eventsMessage([draftPost(postNumber)]));
  await world.finished(postNumber);
  return { postNumber, id: (await world.onlyEvent(postNumber)).id };
}

describe('With AUTOMATIC_JUDGEMENT off', () => {
  it('no model is called, the Draft stays, the step finishes and the rules still publish', async () => {
    silent.script();
    const [draft, read] = [newPost(), newPost()];

    await send(off, eventsMessage([draftPost(draft), collectedPost(read)]));
    await world.finished(draft);
    await world.finished(read);

    expect(silent.received()).toEqual([]);
    expect(await world.judgementOf(draft)).toBeNull();
    expect((await world.onlyEvent(draft)).state).toBe('draft');
    expect(await world.onlyEvent(read)).toMatchObject({ state: 'published', publicationRoute: 'rule' });
  });
});

describe('The service step over one Draft, with AUTOMATIC_JUDGEMENT off', () => {
  it('still judges, for the evaluation, and publishes nothing', async () => {
    const { postNumber, id } = await storedDraft();
    silent.script(answer());

    const judgement = await judgements.judgeDraft(id);

    expect(judgement).toMatchObject({ outcome: 'judged', attempts: 1, publishedAt: null });
    expect((await world.onlyEvent(postNumber)).state).toBe('draft');
  });

  it('a later script publishes what passed, through the step over one Draft', async () => {
    const { postNumber, id } = await storedDraft();
    silent.script(answer());

    await step.overDraft(id);

    expect(await world.onlyEvent(postNumber)).toMatchObject({ state: 'published', publicationRoute: 'judgement' });
  });

  it('an event with no post of its own is refused', async () => {
    const { id } = await world.prisma.globalEvent.create({ data: { title: '직접 만든 행사', description: '' } });

    await expect(judgements.judgeDraft(id)).rejects.toThrow('no post of its own');
  });
});

describe('The admin API', () => {
  it('gives a post whose step failed, with why, until the step finishes', async () => {
    vi.spyOn(world.step, 'publishPost').mockRejectedValueOnce(new Error('The database went away'));
    const postNumber = newPost();
    world.scripted.script();

    await send(world.judging, eventsMessage([collectedPost(postNumber)]));
    await vi.waitFor(async () => {
      expect((await world.sourcePost(postNumber)).stepFailure).toBe('Error');
    });

    expect(await world.unsettled()).toContainEqual(
      expect.objectContaining({
        source: 'snu_events',
        key: String(postNumber),
        stepFinished: false,
        stepFailure: 'Error',
      }),
    );

    await world.nextCollection();
    await world.finished(postNumber);

    expect((await world.unsettled()).map(({ key }) => key)).not.toContain(String(postNumber));
  });

  it('gives a post whose Judgement could not be made while a Draft waits, and not once it is discarded', async () => {
    const failure = { error: new Error('The provider failed') };
    world.scripted.script(failure, failure);
    const postNumber = newPost();

    await world.collected(draftPost(postNumber));
    await world.nextCollection();
    await world.finished(postNumber);

    expect(await world.unsettled()).toContainEqual(
      expect.objectContaining({
        key: String(postNumber),
        stepFinished: true,
        judgementFailure: 'Error',
        judgementAttempts: 2,
      }),
    );

    const { id, version } = await world.onlyEvent(postNumber);
    await changeState(world.judging, world.administrator, id, 'discard', version);

    expect((await world.unsettled()).map(({ key }) => key)).not.toContain(String(postNumber));
  });
});

describe('The list of unsettled posts', () => {
  it('is for Administrators', async () => {
    const { accessToken } = await signIn(world.judging);

    await request(world.judging.getHttpServer())
      .get('/admin/global-events/unsettled-posts')
      .auth(accessToken, { type: 'bearer' })
      .expect(401);
  });
});

describe('The app', () => {
  it('receives no Judgement or route of an event a Judgement published, by its strict schema', async () => {
    world.scripted.script(answer());
    const postNumber = newPost();
    await world.collected(draftPost(postNumber));
    const { accessToken } = await signIn(world.judging);
    const { id } = await world.onlyEvent(postNumber);

    expect(await publishedAmong(world.judging, accessToken, [id])).toHaveLength(1);
  });
});
