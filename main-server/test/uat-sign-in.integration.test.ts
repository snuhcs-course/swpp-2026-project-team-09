/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { loadSeed } from '../src/load-seed.js';
import { UAT_ACCOUNT_LIST } from '../src/uat/uat-accounts.js';
import { createDatabase } from './containers.js';
import { googleIdToken } from './google.js';
import { signInResultSchema } from './sign-in.js';
import { startApp } from './start-app.js';

// The UAT accounts sign in by their keys in place of Google's ID token while HE_ACCOUNTS is on. Their Google subjects
// are fixed, so the Users live in a database of their own and show in no other test file's lists.

const INVALID = { message: 'The Google ID token is invalid or expired.' };

let prisma: PrismaClient;
let drop: () => Promise<void>;
let on: INestApplication<Server>;
let off: INestApplication<Server>;

beforeAll(async () => {
  let url: string;
  ({ prisma, url, drop } = await createDatabase(inject('settings').DATABASE_URL));
  // The app reads the campus map's Places at its start.
  await loadSeed(prisma);
  on = await startApp({ ...inject('settings'), DATABASE_URL: url, HE_ACCOUNTS: 'on' });
  // Unset, as on every server but swpp-a.
  off = await startApp({ ...inject('settings'), DATABASE_URL: url, HE_ACCOUNTS: undefined });
});

afterAll(async () => {
  await on.close();
  await off.close();
  await drop();
});

function postIdToken(app: INestApplication<Server>, idToken: string): request.Test {
  return request(app.getHttpServer()).post('/auth/google').send({ idToken });
}

function userIdOf(accessToken: string): string {
  return z.object({ sub: z.string() }).parse(new JwtService().decode(accessToken)).sub;
}

describe('With HE_ACCOUNTS on', () => {
  it("creates the User at a key's first sign-in, with the persona's Google name", async () => {
    const response = await postIdToken(on, 'uat-a1');

    expect(response.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: 'uat-a1' } });
    expect(userIdOf(signInResultSchema.parse(response.body).accessToken)).toBe(user.id);
    expect(user.googleName).toBe('김서연 / 학생 / 컴퓨터공학부');
    expect(user.email).toMatch(/\.invalid$/u);
  });

  it('signs in by a key as the User the UAT data made with it', async () => {
    const seeded = await prisma.user.create({
      data: {
        googleSubject: 'uat-b',
        email: 'uat-b@uat.invalid',
        googleName: '이도현 / 학생 / 경영학과',
        name: '이도현',
        department: '경영학과',
        friendId: 'UATB2345',
      },
    });

    const response = await postIdToken(on, 'uat-b');

    expect(response.status).toBe(200);
    expect(userIdOf(signInResultSchema.parse(response.body).accessToken)).toBe(seeded.id);
  });

  it.each([...UAT_ACCOUNT_LIST])(
    'signs in by $key with Onboarding to do and $name of $department suggested',
    async (account) => {
      const response = await postIdToken(on, account.key);

      expect(response.status).toBe(200);
      expect(signInResultSchema.parse(response.body).onboarding).toStrictEqual({
        completed: false,
        suggestion: { name: account.name, department: account.department },
      });
    },
  );
});

describe('With HE_ACCOUNTS on, any other ID token', () => {
  it('refuses an unknown key as an invalid ID token', async () => {
    const response = await postIdToken(on, 'uat-z');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(INVALID);
  });

  it('signs in with a Google ID token as before', async () => {
    const response = await postIdToken(on, googleIdToken());

    expect(response.status).toBe(200);
  });
});

describe('With HE_ACCOUNTS unset, so off', () => {
  it.each([...UAT_ACCOUNT_LIST])('refuses $key as an invalid ID token', async ({ key }) => {
    const response = await postIdToken(off, key);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(INVALID);
  });

  it('signs in with a Google ID token as before', async () => {
    const response = await postIdToken(off, googleIdToken());

    expect(response.status).toBe(200);
  });
});
