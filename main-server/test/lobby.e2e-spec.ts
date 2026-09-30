import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { googleSubject } from './google.js';
import { patchProfile } from './profile.js';
import { signIn, signInBeforeOnboarding, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

function postLobby(accessToken?: string): request.Test {
  return withAccessToken(request(app.getHttpServer()).post('/lobby'), accessToken);
}

describe('The lobby', () => {
  it('answers an onboarded User with their latest profile', async () => {
    const { accessToken } = await signIn(app, {}, { name: '김철수', department: '경영학과' });
    await patchProfile(app, accessToken, { hashtags: ['AI'] });

    const response = await postLobby(accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      profile: { name: '김철수', department: '경영학과', admissionYear: null, hashtags: ['AI'] },
    });
  });

  it('sends a User who has not finished onboarding back to it, with the suggestion', async () => {
    const { accessToken } = await signInBeforeOnboarding(app, { name: '홍길동 / 학생 / 컴퓨터공학부' });

    const response = await postLobby(accessToken);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      code: 'ONBOARDING_REQUIRED',
      message: 'Complete onboarding first.',
      onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
    });
  });

  it("suggests from the Google name of the User's last sign-in", async () => {
    const sub = googleSubject();
    await signInBeforeOnboarding(app, { sub, name: '홍길동 / 학생 / 컴퓨터공학부' });
    const { accessToken } = await signInBeforeOnboarding(app, { sub, name: '홍길동 / 학생 / 경제학부' });

    const response = await postLobby(accessToken);

    expect(response.body).toMatchObject({ onboarding: { suggestion: { name: '홍길동', department: '경제학부' } } });
  });

  it('refuses a request without an access token with 401', async () => {
    expect((await postLobby()).status).toBe(401);
  });
});
