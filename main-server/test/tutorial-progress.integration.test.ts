/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import { startApp } from './start-app.js';
import { BUTTON_KEYS, completeAll, getTutorial, postTutorial, statuses, tutorialAfter } from './tutorial.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

async function enabledUser(): Promise<TestUser> {
  const user = await signInUser(app);
  await tutorialAfter(postTutorial(app, user, 'enable'));
  return user;
}

describe('Starting a quest', () => {
  it('makes the tutorial active and the quest started', async () => {
    const user = await enabledUser();

    const tutorial = await tutorialAfter(postTutorial(app, user, 'quests/admin-shuttle/start'));

    expect(tutorial.state).toBe('active');
    expect(statuses(tutorial)).toMatchObject({ 's-card': 'notStarted', 'admin-shuttle': 'started' });
  });

  it('runs several quests at once', async () => {
    const user = await enabledUser();
    await tutorialAfter(postTutorial(app, user, 'quests/s-card/start'));

    const tutorial = await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/start'));

    expect(statuses(tutorial)).toEqual({
      's-card': 'started',
      'admin-shuttle': 'notStarted',
      kwanjeong: 'started',
      'health-clinic': 'notStarted',
      'art-museum': 'notStarted',
    });
  });

  it('answers the same when repeated, and leaves a completed quest completed', async () => {
    const user = await enabledUser();
    const first = await tutorialAfter(postTutorial(app, user, 'quests/s-card/start'));

    expect(await tutorialAfter(postTutorial(app, user, 'quests/s-card/start'))).toEqual(first);
    await tutorialAfter(postTutorial(app, user, 'quests/s-card/complete', { by: 'button' }));
    expect(statuses(await tutorialAfter(postTutorial(app, user, 'quests/s-card/start')))).toMatchObject({
      's-card': 'completed',
    });
  });

  it('is refused for a key the content does not hold', async () => {
    const user = await enabledUser();

    const response = await postTutorial(app, user, 'quests/no-such-quest/start');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'TUTORIAL_QUEST_NOT_FOUND' });
  });
});

describe('Completing a quest', () => {
  it('completes it, started or not', async () => {
    const user = await enabledUser();
    await tutorialAfter(postTutorial(app, user, 'quests/s-card/start'));
    await tutorialAfter(postTutorial(app, user, 'quests/s-card/complete', { by: 'button' }));

    const tutorial = await tutorialAfter(postTutorial(app, user, 'quests/health-clinic/complete', { by: 'button' }));

    expect(tutorial.state).toBe('active');
    expect(statuses(tutorial)).toMatchObject({ 's-card': 'completed', 'health-clinic': 'completed' });
  });

  it('answers the same when repeated', async () => {
    const user = await enabledUser();
    const first = await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'checked' }));

    expect(await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'checked' }))).toEqual(first);
    expect(await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'forced' }))).toEqual(first);
  });

  it.each([
    ['s-card', 'checked'],
    ['s-card', 'skipped'],
    ['kwanjeong', 'button'],
    ['kwanjeong', 'done'],
  ])('is refused for %s by %s', async (key, by) => {
    const user = await enabledUser();

    const response = await postTutorial(app, user, `quests/${key}/complete`, { by });

    expect(response.status).toBe(400);
    expect(statuses(await tutorialAfter(getTutorial(app, user)))[key]).toBe('notStarted');
  });

  it.each(['checked', 'forced', 'skipped'])('accepts the 관정 quest by %s', async (by) => {
    const user = await enabledUser();

    const tutorial = await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by }));

    expect(statuses(tutorial)['kwanjeong']).toBe('completed');
  });

  it('is refused without `by`, and for a key the content does not hold', async () => {
    const user = await enabledUser();

    expect((await postTutorial(app, user, 'quests/s-card/complete', {})).status).toBe(400);
    expect((await postTutorial(app, user, 'quests/no-such-quest/complete', { by: 'button' })).status).toBe(404);
  });
});

describe('Finishing', () => {
  it('follows the last quest completed, whichever it is', async () => {
    const user = await enabledUser();
    await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'skipped' }));
    for (const key of BUTTON_KEYS.slice(0, -1)) {
      // oxlint-disable-next-line no-await-in-loop -- one after another, as the User would
      expect((await tutorialAfter(postTutorial(app, user, `quests/${key}/complete`, { by: 'button' }))).state).toBe(
        'active',
      );
    }

    const last = await tutorialAfter(postTutorial(app, user, 'quests/art-museum/complete', { by: 'button' }));

    expect(last.state).toBe('finished');
    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('finished');
  });

  it('also follows the last completions sent together', async () => {
    const user = await enabledUser();

    await Promise.all([
      ...BUTTON_KEYS.map((key) => tutorialAfter(postTutorial(app, user, `quests/${key}/complete`, { by: 'button' }))),
      tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'checked' })),
    ]);

    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('finished');
  });

  it('counts even when the tutorial was never turned on', async () => {
    const user = await signInUser(app);

    expect((await completeAll(app, user)).state).toBe('finished');
  });
});

describe('Stopping and turning on again', () => {
  it('keeps the progress', async () => {
    const user = await enabledUser();
    await tutorialAfter(postTutorial(app, user, 'quests/s-card/complete', { by: 'button' }));
    await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/start'));
    const before = statuses(await tutorialAfter(getTutorial(app, user)));

    const stopped = await tutorialAfter(postTutorial(app, user, 'stop'));
    const again = await tutorialAfter(postTutorial(app, user, 'enable'));

    expect(stopped.state).toBe('stopped');
    expect(statuses(stopped)).toEqual(before);
    expect(again.state).toBe('active');
    expect(statuses(again)).toEqual(before);
  });

  it('answers the same when repeated', async () => {
    const user = await enabledUser();
    const stopped = await tutorialAfter(postTutorial(app, user, 'stop'));

    expect(await tutorialAfter(postTutorial(app, user, 'stop'))).toEqual(stopped);
    const enabled = await tutorialAfter(postTutorial(app, user, 'enable'));
    expect(await tutorialAfter(postTutorial(app, user, 'enable'))).toEqual(enabled);
    expect(enabled.state).toBe('available');
  });

  it('leaves a finished tutorial finished when every quest is still completed', async () => {
    const user = await enabledUser();
    await completeAll(app, user);

    const again = await tutorialAfter(postTutorial(app, user, 'enable'));

    expect(again.state).toBe('finished');
    expect(again.quests.map(({ status }) => status)).toEqual(Array.from({ length: 5 }, () => 'completed'));
    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('finished');
  });

  it('leaves a stopped and finished tutorial finished', async () => {
    const user = await enabledUser();
    await completeAll(app, user);
    await tutorialAfter(postTutorial(app, user, 'stop'));

    expect((await tutorialAfter(postTutorial(app, user, 'enable'))).state).toBe('finished');
  });
});
