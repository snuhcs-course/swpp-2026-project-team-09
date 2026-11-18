/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { A_FRIEND_ID } from './friends.js';
import { googleSubject } from './google.js';
import { getProfile, NO_LIBRARY_DETAILS, NOT_FROM_ACCOUNT, patchProfile } from './profile.js';
import {
  getMe,
  ONBOARDED_PROFILE,
  postOnboarding,
  signIn,
  signInAsAdministrator,
  signInBeforeOnboarding,
} from './sign-in.js';
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
    const { accessToken } = await signIn(app, {}, { name: '홍길동', department: '컴퓨터공학부' });

    const response = await getProfile(app, accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ...ONBOARDED_PROFILE,
      admissionYear: null,
      hashtags: [],
      friendId: A_FRIEND_ID,
      ...NO_LIBRARY_DETAILS,
      ...NOT_FROM_ACCOUNT,
    });
  });
});

describe('Editing the profile', () => {
  it('answers with the saved profile, and a later read shows it', async () => {
    const { accessToken } = await signIn(app);
    const edited = { name: '김철수', department: '컴퓨터공학부', admissionYear: 2024, hashtags: ['AI', '보드게임'] };

    const response = await patchProfile(app, accessToken, edited);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ...edited, friendId: A_FRIEND_ID, ...NO_LIBRARY_DETAILS, ...NOT_FROM_ACCOUNT });
    expect((await getProfile(app, accessToken)).body).toEqual(response.body);
  });

  it('changes only the fields sent', async () => {
    const { accessToken } = await signIn(app);
    await patchProfile(app, accessToken, { department: '경영학과', admissionYear: 2023, hashtags: ['러닝'] });

    const response = await patchProfile(app, accessToken, { admissionYear: 2022 });

    expect(response.body).toEqual({
      ...ONBOARDED_PROFILE,
      department: '경영학과',
      admissionYear: 2022,
      hashtags: ['러닝'],
      friendId: A_FRIEND_ID,
      ...NO_LIBRARY_DETAILS,
      ...NOT_FROM_ACCOUNT,
    });
  });
});

describe('Emptying fields of the profile', () => {
  it('empties the admission year with null and the hashtags with an empty list', async () => {
    const { accessToken } = await signIn(app);
    await patchProfile(app, accessToken, { admissionYear: 2023, hashtags: ['러닝'] });

    const response = await patchProfile(app, accessToken, { admissionYear: null, hashtags: [] });

    expect(response.body).toEqual({
      ...ONBOARDED_PROFILE,
      admissionYear: null,
      hashtags: [],
      friendId: A_FRIEND_ID,
      ...NO_LIBRARY_DETAILS,
      ...NOT_FROM_ACCOUNT,
    });
  });
});

describe('Editing the profile with spaces', () => {
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

describe("The library's details", () => {
  it('are saved, answered and read again: the 학번 as nine digits', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchProfile(app, accessToken, {
      studentNumber: '2026-12345',
      registeredName: '홍길동',
      affiliation: 'exchange',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      studentNumber: '202612345',
      registeredName: '홍길동',
      affiliation: 'exchange',
    });
    expect((await getProfile(app, accessToken)).body).toEqual(response.body);
  });

  it('are cleared by an empty 학번 and registered name and a null 소속, and by null', async () => {
    const { accessToken } = await signIn(app);
    const details = { studentNumber: '202612345', registeredName: '홍길동', affiliation: 'graduate' };
    await patchProfile(app, accessToken, details);

    const emptied = await patchProfile(app, accessToken, { studentNumber: '', registeredName: '', affiliation: null });
    await patchProfile(app, accessToken, details);
    const nulled = await patchProfile(app, accessToken, { studentNumber: null, registeredName: null });

    expect(emptied.body).toMatchObject(NO_LIBRARY_DETAILS);
    expect(nulled.body).toMatchObject({ studentNumber: null, registeredName: null, affiliation: 'graduate' });
  });

  it('stay as they are when other fields change', async () => {
    const { accessToken } = await signIn(app);
    await patchProfile(app, accessToken, { studentNumber: '202612345', affiliation: 'undergraduate' });

    const response = await patchProfile(app, accessToken, { name: '길동' });

    expect(response.body).toMatchObject({ name: '길동', studentNumber: '202612345', affiliation: 'undergraduate' });
  });
});

describe("The library's details left empty", () => {
  it('keep an empty registered name empty, not the name', async () => {
    const { accessToken } = await signIn(app);

    const response = await patchProfile(app, accessToken, { registeredName: '  ' });

    expect(response.body).toMatchObject({ name: ONBOARDED_PROFILE.name, registeredName: null });
  });

  it('are not taken by onboarding', async () => {
    const { accessToken } = await signInBeforeOnboarding(app);

    await postOnboarding(app, accessToken, {
      ...ONBOARDED_PROFILE,
      studentNumber: '202612345',
      affiliation: 'exchange',
    });

    expect((await getProfile(app, accessToken)).body).toMatchObject(NO_LIBRARY_DETAILS);
  });
});

describe('A later sign-in', () => {
  it('keeps the name the User chose where the account gives none', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    await patchProfile(app, accessToken, { name: '길동' });

    const again = await signIn(app, { sub });

    expect((await getProfile(app, again.accessToken)).body).toMatchObject({ name: '길동' });
  });
});

describe('The name and the department that the account gives', () => {
  const GOOGLE_NAME = '홍길동 / 학생 / 컴퓨터공학부';

  it('are kept when an older app sends others, and the rest of its edit is saved', async () => {
    const { accessToken } = await signIn(app, { name: GOOGLE_NAME });

    const response = await patchProfile(app, accessToken, { name: '길동', department: '경영학과', hashtags: ['러닝'] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: '홍길동',
      department: '컴퓨터공학부',
      hashtags: ['러닝'],
      fromAccount: { name: true, department: true },
    });
  });

  it("follow the account's Google name at a later sign-in", async () => {
    const sub = googleSubject();
    await signIn(app, { sub, name: GOOGLE_NAME });

    const again = await signIn(app, { sub, name: '홍길동 / 학생 / 경제학부' });

    expect((await getProfile(app, again.accessToken)).body).toMatchObject({ name: '홍길동', department: '경제학부' });
  });

  it('replace the ones the User chose at the next sign-in', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    await patchProfile(app, accessToken, { name: '길동', department: '경영학과' });

    const again = await signIn(app, { sub, name: GOOGLE_NAME });

    expect((await getProfile(app, again.accessToken)).body).toMatchObject({
      name: '홍길동',
      department: '컴퓨터공학부',
    });
  });
});

describe("Another User's profile", () => {
  it('stays as it was when a User edits their own', async () => {
    const first = await signIn(app);
    const second = await signIn(app, {}, { name: '김철수', department: '경영학과' });

    await patchProfile(app, first.accessToken, { name: '길동', department: '경제학부', hashtags: ['러닝'] });

    expect((await getProfile(app, second.accessToken)).body).toEqual({
      name: '김철수',
      department: '경영학과',
      admissionYear: null,
      hashtags: [],
      friendId: A_FRIEND_ID,
      ...NO_LIBRARY_DETAILS,
      ...NOT_FROM_ACCOUNT,
    });
  });

  it('cannot be reached by its id', async () => {
    const other = await signIn(app);
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
