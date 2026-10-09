/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Controller, Get, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AllowBeforeOnboarding } from '../src/common/allow-before-onboarding.decorator.js';
import { googleSubject } from './google.js';
import { getProfile, patchProfile } from './profile.js';
import { getMe, postSignOut, signIn, signInBeforeOnboarding, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

// Routes of a feature to come: one unmarked, one open before onboarding.
@Controller('test/feature')
class FeatureController {
  @Get('unmarked')
  unmarked(): { ok: boolean } {
    return { ok: true };
  }

  @AllowBeforeOnboarding()
  @Get('marked')
  marked(): { ok: boolean } {
    return { ok: true };
  }
}

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings, [FeatureController]);
});

afterAll(async () => {
  await app.close();
});

type Call = (accessToken: string) => request.Test;

const post =
  (path: string): Call =>
  (accessToken) =>
    withAccessToken(request(app.getHttpServer()).post(path), accessToken);
const get =
  (path: string): Call =>
  (accessToken) =>
    withAccessToken(request(app.getHttpServer()).get(path), accessToken);

const guarded: [string, Call][] = [
  ['GET /users/me', (accessToken) => getMe(app, accessToken)],
  ['GET /users/me/profile', (accessToken) => getProfile(app, accessToken)],
  ['PATCH /users/me/profile', (accessToken) => patchProfile(app, accessToken, { hashtags: ['AI'] })],
  ['POST /lobby', post('/lobby')],
  ['an unmarked route of a feature to come', get('/test/feature/unmarked')],
];

describe('A User who has not finished onboarding', () => {
  it.each(guarded)('gets 403 with what onboarding starts from on %s', async (_route, call) => {
    const { accessToken } = await signInBeforeOnboarding(app, { name: '홍길동 / 학생 / 컴퓨터공학부' });

    const response = await call(accessToken);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'ONBOARDING_REQUIRED',
      message: 'Complete onboarding first.',
      onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
    });
  });

  it('can use a route marked open before onboarding, and sign out', async () => {
    const { accessToken } = await signInBeforeOnboarding(app);

    expect((await get('/test/feature/marked')(accessToken)).status).toBe(200);
    expect((await postSignOut(app, accessToken)).status).toBe(204);
  });
});

describe('A User who has not finished onboarding, with a session that has ended', () => {
  it('gets 401 with the code of a replaced session after a sign-in on another phone', async () => {
    const sub = googleSubject();
    const firstPhone = await signInBeforeOnboarding(app, { sub });
    await signInBeforeOnboarding(app, { sub });

    const response = await post('/lobby')(firstPhone.accessToken);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ code: 'SESSION_REPLACED' });
  });

  it('gets 401 after signing out', async () => {
    const { accessToken } = await signInBeforeOnboarding(app);
    await postSignOut(app, accessToken);

    expect((await getMe(app, accessToken)).status).toBe(401);
  });
});

describe('A User who has finished onboarding', () => {
  it.each(guarded)('is let through on %s', async (_route, call) => {
    const { accessToken } = await signIn(app);

    expect((await call(accessToken)).status).toBe(200);
  });
});
