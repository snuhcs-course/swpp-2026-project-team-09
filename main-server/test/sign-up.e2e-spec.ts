import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { googleSubject } from './google.js';
import { getProfile } from './profile.js';
import { postSignIn, signIn, tokensSchema } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

describe("A new account's sign-in without a profile", () => {
  it('asks for one with what the Google account says, and stores nothing', async () => {
    const sub = googleSubject();

    const response = await postSignIn(app, { sub, name: '홍길동 / 학생 / 컴퓨터공학부' }, null);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      statusCode: 422,
      error: 'Unprocessable Entity',
      code: 'PROFILE_REQUIRED',
      message: 'A new account signs in with a profile.',
      suggestion: { name: '홍길동', department: '컴퓨터공학부' },
    });
    expect(await prisma.user.count({ where: { googleSubject: sub } })).toBe(0);
  });

  it.each([
    ['a name alone', 'Gildong Hong', { name: 'Gildong Hong', department: null }],
    ['no name', undefined, { name: null, department: null }],
    ['parts the profile refuses', `${'a'.repeat(31)} / 학생 / ${'b'.repeat(51)}`, { name: null, department: null }],
  ])('suggests what it can when the Google account has %s', async (_case, name, suggestion) => {
    const response = await postSignIn(app, { name }, null);

    expect(response.body).toMatchObject({ code: 'PROFILE_REQUIRED', suggestion });
  });
});

describe("A new account's sign-in with a profile", () => {
  it('creates the User with that profile and answers with tokens', async () => {
    const response = await postSignIn(
      app,
      { name: '홍길동 / 학생 / 컴퓨터공학부' },
      { name: ' 김철수 ', department: '컴퓨터공학부, 경제학부' },
    );

    expect(response.status).toBe(200);
    const { accessToken } = tokensSchema.parse(response.body);
    expect((await getProfile(app, accessToken)).body).toEqual({
      name: '김철수',
      department: '컴퓨터공학부, 경제학부',
      admissionYear: null,
      hashtags: [],
    });
  });

  it.each([
    ['an empty name', { name: '', department: '경영학과' }, 'profile.name'],
    ['no department', { name: '홍길동' }, 'profile.department'],
  ])('refuses %s with 400, names the field and stores nothing', async (_case, profile, field) => {
    const sub = googleSubject();

    const response = await postSignIn(app, { sub }, profile);

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain(`"${field}:`);
    expect(await prisma.user.count({ where: { googleSubject: sub } })).toBe(0);
  });
});

describe("An existing User's sign-in", () => {
  it('leaves the profile as it is, with another profile or none', async () => {
    const sub = googleSubject();
    await signIn(app, { sub }, { name: '홍길동', department: '컴퓨터공학부' });

    await signIn(app, { sub }, { name: '김철수', department: '경영학과' });
    const withoutProfile = await postSignIn(app, { sub }, null);

    expect(withoutProfile.status).toBe(200);
    const { accessToken } = await signIn(app, { sub });
    expect((await getProfile(app, accessToken)).body).toMatchObject({ name: '홍길동', department: '컴퓨터공학부' });
  });
});
