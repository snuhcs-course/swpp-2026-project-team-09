/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { signInUser } from './friends.js';
import { patchProfile } from './profile.js';
import { signInAsAdministrator, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';
import { admitIn, getTutorial, postTutorial, tutorialAfter, yearInKorea } from './tutorial.js';
import request from 'supertest';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

describe('A User admitted this year', () => {
  it('finds the tutorial on without turning it on', async () => {
    const user = await signInUser(app);
    await admitIn(app, user, yearInKorea());

    const tutorial = await tutorialAfter(getTutorial(app, user));

    expect(tutorial.state).toBe('available');
    expect(tutorial.eligibleByDefault).toBe(true);
  });

  it('keeps it on after changing the admission year, no longer eligible by default', async () => {
    const user = await signInUser(app);
    await admitIn(app, user, yearInKorea());
    await tutorialAfter(getTutorial(app, user));

    await admitIn(app, user, yearInKorea() - 3);

    const tutorial = await tutorialAfter(getTutorial(app, user));
    expect(tutorial.state).toBe('available');
    expect(tutorial.eligibleByDefault).toBe(false);
  });

  it('does not find it on again after stopping it', async () => {
    const user = await signInUser(app);
    await admitIn(app, user, yearInKorea());
    await tutorialAfter(getTutorial(app, user));
    await tutorialAfter(postTutorial(app, user, 'stop'));

    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('stopped');
  });

  it('finds it on, the row shown again, when the admission year is given after closing the 내 정보 row', async () => {
    const user = await signInUser(app);
    await tutorialAfter(postTutorial(app, user, 'hide-row'));

    await admitIn(app, user, yearInKorea());

    expect(await tutorialAfter(getTutorial(app, user))).toMatchObject({ state: 'available', rowHidden: false });
  });
});

describe('Eligible by default', () => {
  it('is said in the replies of the POSTs too, stopped or not', async () => {
    const user = await signInUser(app);
    await admitIn(app, user, yearInKorea());

    expect(await tutorialAfter(postTutorial(app, user, 'stop'))).toMatchObject({
      state: 'stopped',
      eligibleByDefault: true,
    });
  });
});

describe('Any other User', () => {
  it.each([
    ['admitted last year', (): number | null => yearInKorea() - 1],
    ['without an admission year', (): number | null => null],
  ])('finds the tutorial off when %s', async (_, year) => {
    const user = await signInUser(app);
    await patchProfile(app, user.accessToken, { admissionYear: year() });

    const tutorial = await tutorialAfter(getTutorial(app, user));

    expect(tutorial.state).toBe('off');
    expect(tutorial.eligibleByDefault).toBe(false);
    expect(tutorial.rowHidden).toBe(false);
    expect(tutorial.quests.map(({ status }) => status)).toEqual(Array.from({ length: 15 }, () => 'notStarted'));
  });

  it('finds it on after turning it on', async () => {
    const user = await signInUser(app);

    const enabled = await tutorialAfter(postTutorial(app, user, 'enable'));

    expect(enabled.state).toBe('available');
    expect((await tutorialAfter(getTutorial(app, user))).state).toBe('available');
  });

  it('keeps it off after closing the 내 정보 row', async () => {
    const user = await signInUser(app);

    expect((await tutorialAfter(postTutorial(app, user, 'hide-row'))).state).toBe('off');
    expect((await tutorialAfter(postTutorial(app, user, 'hide-row'))).state).toBe('off');
  });

  it('reads the 내 정보 row hidden after closing it, until turning the tutorial on', async () => {
    const user = await signInUser(app);
    const hidden = await tutorialAfter(postTutorial(app, user, 'hide-row'));

    const read = await tutorialAfter(getTutorial(app, user));
    const enabled = await tutorialAfter(postTutorial(app, user, 'enable'));

    expect(hidden.rowHidden).toBe(true);
    expect(read).toMatchObject({ state: 'off', rowHidden: true });
    expect(enabled).toMatchObject({ state: 'available', rowHidden: false });
    expect((await tutorialAfter(getTutorial(app, user))).rowHidden).toBe(false);
  });
});

describe('An exchange student', () => {
  it('finds the tutorial on without turning it on, whatever the admission year', async () => {
    const user = await signInUser(app);
    await admitIn(app, user, yearInKorea() - 1);
    await patchProfile(app, user.accessToken, { affiliation: 'exchange' }).expect(200);

    expect(await tutorialAfter(getTutorial(app, user))).toMatchObject({ state: 'available', eligibleByDefault: true });
  });
});

describe('The tutorial', () => {
  it.each([
    ['GET', ''],
    ['POST', '/enable'],
    ['POST', '/stop'],
    ['POST', '/hide-row'],
    ['POST', '/quests/s-card/start'],
    ['POST', '/quests/s-card/complete'],
  ])('is refused to an Administrator: %s %s', async (method, path) => {
    const { accessToken } = await signInAsAdministrator(app);
    const server = request(app.getHttpServer());
    const call = method === 'GET' ? server.get(`/tutorial${path}`) : server.post(`/tutorial${path}`);

    expect((await withAccessToken(call, accessToken).send({ by: 'button' })).status).toBe(401);
  });
});
