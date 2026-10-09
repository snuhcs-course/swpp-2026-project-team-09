/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { A_FRIEND_ID } from './friends.js';
import { googleSubject } from './google.js';
import { getProfile } from './profile.js';
import { postOnboarding, postSignIn, signInBeforeOnboarding, signInResultSchema } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
// The tests read what is stored with their own connection, under the server's settings.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function onboardedAt(sub: string): Promise<Date | null> {
  return prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } }).then((user) => user.onboardedAt);
}

describe("A new User's sign-in", () => {
  it('says that onboarding is not complete and suggests what the Google name holds', async () => {
    const response = await postSignIn(app, { name: '홍길동 / 학생 / 컴퓨터공학부' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      onboarding: { completed: false, suggestion: { name: '홍길동', department: '컴퓨터공학부' } },
    });
  });

  it.each([
    ['a name alone', 'Gildong Hong', { name: 'Gildong Hong', department: null }],
    ['no name', undefined, { name: null, department: null }],
    ['parts the profile refuses', `${'a'.repeat(31)} / 학생 / ${'b'.repeat(51)}`, { name: null, department: null }],
  ])('suggests what it can when the Google account has %s', async (_case, name, suggestion) => {
    const response = await postSignIn(app, { name });

    expect(response.body).toMatchObject({ onboarding: { completed: false, suggestion } });
  });

  it('creates the User with an empty name and department', async () => {
    const sub = googleSubject();

    await signInBeforeOnboarding(app, { sub, name: '홍길동 / 학생 / 컴퓨터공학부' });

    expect(await prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } })).toMatchObject({
      name: '',
      department: '',
      admissionYear: null,
      hashtags: [],
      onboardedAt: null,
    });
  });
});

describe('Completing onboarding', () => {
  it('saves the profile sent, and a later sign-in says that onboarding is complete', async () => {
    const sub = googleSubject();
    const { accessToken } = await signInBeforeOnboarding(app, { sub, name: '홍길동 / 학생 / 컴퓨터공학부' });
    const profile = { name: '김철수', department: '경영학과', admissionYear: 2024, hashtags: ['AI'] };

    const response = await postOnboarding(app, accessToken, profile);

    expect(response.status).toBe(204);
    expect((await getProfile(app, accessToken)).body).toEqual({ ...profile, friendId: A_FRIEND_ID });
    expect(signInResultSchema.parse((await postSignIn(app, { sub })).body).onboarding).toEqual({ completed: true });
  });

  it('needs only the name and the department', async () => {
    const { accessToken } = await signInBeforeOnboarding(app);

    const response = await postOnboarding(app, accessToken, { name: '김철수', department: '경영학과' });

    expect(response.status).toBe(204);
    expect((await getProfile(app, accessToken)).body).toEqual({
      name: '김철수',
      department: '경영학과',
      admissionYear: null,
      hashtags: [],
      friendId: A_FRIEND_ID,
    });
  });

  it('answers a repeat as the first time, saves it again and keeps the time of the first completion', async () => {
    const sub = googleSubject();
    const { accessToken } = await signInBeforeOnboarding(app, { sub });
    await postOnboarding(app, accessToken, { name: '김철수', department: '경영학과' });
    const completedAt = await onboardedAt(sub);

    const again = await postOnboarding(app, accessToken, { name: '김철수', department: '경제학부' });

    expect(again.status).toBe(204);
    expect((await getProfile(app, accessToken)).body).toMatchObject({ department: '경제학부' });
    expect(completedAt).not.toBeNull();
    expect(await onboardedAt(sub)).toEqual(completedAt);
  });
});

describe('Onboarding with an invalid profile', () => {
  it.each([
    ['no name', { department: '경영학과' }, 'name'],
    ['an empty department', { name: '김철수', department: '' }, 'department'],
    ['an admission year before 1946', { name: '김철수', department: '경영학과', admissionYear: 1945 }, 'admissionYear'],
  ])(
    'refuses %s with 400, names the field, saves nothing and leaves onboarding incomplete',
    async (_case, body, field) => {
      const sub = googleSubject();
      const { accessToken } = await signInBeforeOnboarding(app, { sub });

      const response = await postOnboarding(app, accessToken, body);

      expect(response.status).toBe(400);
      expect(JSON.stringify(response.body)).toContain(`"${field}:`);
      expect(await prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } })).toMatchObject({
        name: '',
        department: '',
        admissionYear: null,
        onboardedAt: null,
      });
    },
  );
});

describe('Two first sign-ins of one Google account at the same moment', () => {
  it('create one User', async () => {
    const sub = googleSubject();

    const responses = await Promise.all([postSignIn(app, { sub }), postSignIn(app, { sub })]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200]);
    expect(await prisma.user.count({ where: { googleSubject: sub } })).toBe(1);
  });
});

describe('A sign-in on another phone during onboarding', () => {
  it("ends the first phone's onboarding with the code of a replaced session, and the other phone completes it", async () => {
    const sub = googleSubject();
    const firstPhone = await signInBeforeOnboarding(app, { sub });
    const otherPhone = await signInBeforeOnboarding(app, { sub });

    const first = await postOnboarding(app, firstPhone.accessToken, { name: '김철수', department: '경영학과' });
    const other = await postOnboarding(app, otherPhone.accessToken, { name: '홍길동', department: '컴퓨터공학부' });

    expect(first.status).toBe(401);
    expect(first.body).toMatchObject({ code: 'SESSION_REPLACED' });
    expect(other.status).toBe(204);
    expect((await getProfile(app, otherPhone.accessToken)).body).toMatchObject({
      name: '홍길동',
      department: '컴퓨터공학부',
    });
  });
});

describe('Onboarding without an access token', () => {
  it('is refused with 401', async () => {
    expect((await postOnboarding(app, undefined, { name: '김철수', department: '경영학과' })).status).toBe(401);
  });
});
