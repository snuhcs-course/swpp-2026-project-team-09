import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { googleSubject } from './google.js';
import { getProfile, ONBOARDED_PROFILE, patchProfile, signInOnboarded } from './profile.js';
import { getMe, signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

describe('Reading the profile', () => {
  it('shows what onboarding saved and nothing else yet', async () => {
    const { accessToken } = await signInOnboarded(app, { name: '홍길동', department: '컴퓨터공학부' });

    const response = await getProfile(app, accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: '홍길동', department: '컴퓨터공학부', admissionYear: null, hashtags: [] });
  });
});

describe('Editing the profile', () => {
  it('answers with the saved profile, and a later read shows it', async () => {
    const { accessToken } = await signIn(app);
    const edited = { name: '김철수', department: '컴퓨터공학부', admissionYear: 2024, hashtags: ['AI', '보드게임'] };

    const response = await patchProfile(app, accessToken, edited);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(edited);
    expect((await getProfile(app, accessToken)).body).toEqual(edited);
  });

  it('changes only the fields sent', async () => {
    const { accessToken } = await signInOnboarded(app);
    await patchProfile(app, accessToken, { department: '경영학과', admissionYear: 2023, hashtags: ['러닝'] });

    const response = await patchProfile(app, accessToken, { admissionYear: 2022 });

    expect(response.body).toEqual({
      ...ONBOARDED_PROFILE,
      department: '경영학과',
      admissionYear: 2022,
      hashtags: ['러닝'],
    });
  });

  it('empties the admission year with null and the hashtags with an empty list', async () => {
    const { accessToken } = await signInOnboarded(app);
    await patchProfile(app, accessToken, { admissionYear: 2023, hashtags: ['러닝'] });

    const response = await patchProfile(app, accessToken, { admissionYear: null, hashtags: [] });

    expect(response.body).toEqual({ ...ONBOARDED_PROFILE, admissionYear: null, hashtags: [] });
  });

  it('saves text without the spaces around it', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchProfile(app, accessToken, {
      name: ' 김철수 ',
      department: ' 경영학과\n',
      hashtags: [' AI '],
    });

    expect(response.body).toMatchObject({ name: '김철수', department: '경영학과', hashtags: ['AI'] });
  });
});

describe('A later sign-in', () => {
  it('keeps the name the User chose', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    await patchProfile(app, accessToken, { name: '길동' });

    const again = await signIn(app, { sub });

    expect((await getProfile(app, again.accessToken)).body).toMatchObject({ name: '길동' });
  });
});

describe("Another User's profile", () => {
  it('stays as it was when a User edits their own', async () => {
    const first = await signIn(app);
    const second = await signInOnboarded(app, { name: '김철수', department: '경영학과' });

    await patchProfile(app, first.accessToken, { name: '길동', department: '경제학부', hashtags: ['러닝'] });

    expect((await getProfile(app, second.accessToken)).body).toEqual({
      name: '김철수',
      department: '경영학과',
      admissionYear: null,
      hashtags: [],
    });
  });

  it('cannot be reached by its id', async () => {
    const other = await signInOnboarded(app);
    const { id } = z.object({ id: z.string() }).parse((await getMe(app, other.accessToken)).body);
    const { accessToken } = await signIn(app);
    const server = app.getHttpServer();

    const read = await request(server).get(`/users/${id}/profile`).auth(accessToken, { type: 'bearer' });
    const edit = await request(server)
      .patch(`/users/${id}/profile`)
      .auth(accessToken, { type: 'bearer' })
      .send({ name: '김철수' });

    expect([read.status, edit.status]).toEqual([404, 404]);
    expect((await getProfile(app, other.accessToken)).body).toMatchObject(ONBOARDED_PROFILE);
  });
});

describe('The profile', () => {
  it.each([
    ['no access token', (): undefined => undefined],
    ['a malformed access token', (): string => 'not-a-token'],
    ["an Administrator's access token", async (): Promise<string> => (await signInAsAdministrator(app)).accessToken],
  ])('refuses a request with %s with 401', async (_case, accessToken) => {
    const token = await accessToken();

    expect((await getProfile(app, token)).status).toBe(401);
    expect((await patchProfile(app, token, { name: '김철수' })).status).toBe(401);
  });
});
