/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import {
  BUTTON_KEYS,
  changedTutorialFile,
  completeAll,
  getTutorial,
  P06_KEYS,
  postTutorial,
  QUEST_KEYS,
  statuses,
  tutorialAfter,
} from './tutorial.js';
import { refuseKakao } from './walking-route.js';

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

    expect(statuses(tutorial)).toEqual(
      Object.fromEntries(
        QUEST_KEYS.map((key) => [key, ['s-card', 'kwanjeong'].includes(key) ? 'started' : 'notStarted']),
      ),
    );
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
    const first = await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'button' }));

    expect(await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'button' }))).toEqual(first);
  });

  it.each([
    ['s-card', 'checked'],
    ['s-card', 'skipped'],
    ['night-shuttle', 'forced'],
    ['kwanjeong', 'checked'],
    ['kwanjeong', 'forced'],
    ['kwanjeong', 'skipped'],
    ['kwanjeong', 'done'],
  ])('is refused for %s by %s', async (key, by) => {
    const user = await enabledUser();

    const response = await postTutorial(app, user, `quests/${key}/complete`, { by });

    expect(response.status).toBe(400);
    expect(statuses(await tutorialAfter(getTutorial(app, user)))[key]).toBe('notStarted');
  });

  it('is refused without `by`, and for a key the content does not hold', async () => {
    const user = await enabledUser();

    expect((await postTutorial(app, user, 'quests/s-card/complete', {})).status).toBe(400);
    expect((await postTutorial(app, user, 'quests/no-such-quest/complete', { by: 'button' })).status).toBe(404);
  });
});

describe('With TUTORIAL_KWANJEONG_CHECK off, as by default', () => {
  it('serves the 관정 quest as a button quest with its ask, and accepts it by the button', async () => {
    const user = await enabledUser();
    const served = await tutorialAfter(getTutorial(app, user));

    expect(served.quests.find(({ key }) => key === 'kwanjeong')).toMatchObject({
      completion: { kind: 'button' },
      ask: '관정도서관 7층 열람실에 한 자리 예약해줘',
      links: [],
    });
    const tutorial = await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'button' }));
    expect(statuses(tutorial)['kwanjeong']).toBe('completed');
  });
});

describe('Finishing', () => {
  it('follows the last quest completed, whichever it is', async () => {
    const user = await enabledUser();
    await tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'button' }));
    for (const key of BUTTON_KEYS.filter((one) => one !== 'art-museum')) {
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
      tutorialAfter(postTutorial(app, user, 'quests/kwanjeong/complete', { by: 'button' })),
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
    expect(again.quests.map(({ status }) => status)).toEqual(Array.from({ length: 15 }, () => 'completed'));
    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('finished');
  });

  it('leaves a stopped and finished tutorial finished', async () => {
    const user = await enabledUser();
    await completeAll(app, user);
    await tutorialAfter(postTutorial(app, user, 'stop'));

    expect((await tutorialAfter(postTutorial(app, user, 'enable'))).state).toBe('finished');
  });
});

describe('With TUTORIAL_KWANJEONG_CHECK on', () => {
  let checked: INestApplication<Server>;

  beforeAll(async () => {
    checked = await startApp({ ...inject('settings'), TUTORIAL_KWANJEONG_CHECK: 'true' });
  });

  afterAll(async () => {
    await checked.close();
  });

  it('serves the 관정 quest as the file holds it, with its skip and its ask', async () => {
    const user = await signInUser(checked);

    expect(
      (await tutorialAfter(getTutorial(checked, user))).quests.find(({ key }) => key === 'kwanjeong'),
    ).toMatchObject({
      completion: { kind: 'kwanjeongCheck', skipLabel: '이미 예약 및 이용해본 적이 있어요' },
      ask: '관정도서관 7층 열람실에 한 자리 예약해줘',
    });
  });

  it.each(['checked', 'forced', 'skipped'])('accepts the 관정 quest by %s', async (by) => {
    const user = await signInUser(checked);

    const tutorial = await tutorialAfter(postTutorial(checked, user, 'quests/kwanjeong/complete', { by }));

    expect(statuses(tutorial)['kwanjeong']).toBe('completed');
  });

  it('refuses the 관정 quest by the button', async () => {
    const user = await signInUser(checked);

    expect((await postTutorial(checked, user, 'quests/kwanjeong/complete', { by: 'button' })).status).toBe(400);
  });

  it('keeps a 관정 quest completed by the check once the check is off', async () => {
    const user = await signInUser(checked);
    await tutorialAfter(postTutorial(checked, user, 'quests/kwanjeong/complete', { by: 'checked' }));

    expect(statuses(await tutorialAfter(getTutorial(app, user)))['kwanjeong']).toBe('completed');
  });
});

describe('A User who finished the five quests of P06', () => {
  it('stays finished, and gets the ten new quests on 진행하기 with the five still completed', async () => {
    const file = await changedTutorialFile({ only: P06_KEYS });
    const five = await startApp(
      inject('settings'),
      [],
      refuseKakao,
      refuseMatchServer,
      new ScriptedModel().model,
      [],
      undefined,
      file,
    );
    const user = await signInUser(five);
    try {
      await tutorialAfter(postTutorial(five, user, 'enable'));
      const finished = await completeAll(five, user, {
        keys: P06_KEYS.filter((key) => key !== 'kwanjeong'),
      });
      expect(finished.state).toBe('finished');
    } finally {
      await five.close();
    }

    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('finished');
    const again = await tutorialAfter(postTutorial(app, user, 'enable'));

    expect(again.state).toBe('active');
    expect(statuses(again)).toEqual(
      Object.fromEntries(QUEST_KEYS.map((key) => [key, P06_KEYS.includes(key) ? 'completed' : 'notStarted'])),
    );
  });
});
