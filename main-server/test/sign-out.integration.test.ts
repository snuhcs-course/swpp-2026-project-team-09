/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { googleSubject } from './google.js';
import { overlap } from './overlap.js';
import {
  getMe,
  postRefreshToken,
  postSignIn,
  postSignOut,
  refresh,
  signIn,
  signInResultSchema,
  tokensSchema,
} from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
// The tests read the stored result with their own connection, under the server's settings.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

// Refresh tokens of the User that could still be exchanged, if their session had not ended.
function unrevokedRefreshTokens(sub: string): Promise<number> {
  return prisma.refreshToken.count({ where: { session: { user: { googleSubject: sub } }, revokedAt: null } });
}

describe('Sign-out', () => {
  it('revokes every refresh token of the User', async () => {
    const sub = googleSubject();
    // Refreshed since the sign-in, so that the session has a used token and the one that replaced it.
    const { accessToken, refreshToken } = await refresh(app, (await signIn(app, { sub })).refreshToken);

    const response = await postSignOut(app, accessToken);

    expect(response.status).toBe(204);
    expect((await postRefreshToken(app, refreshToken)).status).toBe(401);
    expect(await unrevokedRefreshTokens(sub)).toBe(0);
  });

  it("keeps other Users' refresh tokens", async () => {
    const other = await signIn(app);

    await postSignOut(app, (await signIn(app)).accessToken);

    expect((await postRefreshToken(app, other.refreshToken)).status).toBe(200);
  });

  it("refuses the session's access token from the next request on, a second sign-out included", async () => {
    const { accessToken } = await signIn(app);

    await postSignOut(app, accessToken);

    for (const response of [await getMe(app, accessToken), await postSignOut(app, accessToken)]) {
      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('code');
    }
  });

  it('refuses a request without an access token', async () => {
    const response = await postSignOut(app);

    expect(response.status).toBe(401);
  });
});

// The app refreshes its tokens while the User signs out, and both reach the database at the same moment.
describe('Sign-out during a refresh', () => {
  it('revokes the token the refresh stores', async () => {
    const sub = googleSubject();
    const { accessToken, refreshToken } = await signIn(app, { sub });

    const [refreshed, signedOut] = await overlap(
      prisma,
      refreshToken,
      () => postRefreshToken(app, refreshToken),
      () => postSignOut(app, accessToken),
    );

    expect(refreshed.status).toBe(200);
    expect(signedOut.status).toBe(204);
    const renewed = tokensSchema.parse(refreshed.body);
    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(401);
    expect(await unrevokedRefreshTokens(sub)).toBe(0);
  });
});

// The replaced phone passed the access token check just before the new phone's sign-in ended its session.
describe('A sign-out on the replaced phone during a sign-in on the new phone', () => {
  it("leaves the new phone's session as it is", async () => {
    const sub = googleSubject();
    const replacedPhone = await signIn(app, { sub });

    const [signedIn, signedOut] = await overlap(
      prisma,
      replacedPhone.refreshToken,
      () => postSignIn(app, { sub }),
      () => postSignOut(app, replacedPhone.accessToken),
    );

    expect(signedIn.status).toBe(200);
    expect(signedOut.status).toBe(204);
    const newPhone = signInResultSchema.parse(signedIn.body);
    expect((await getMe(app, newPhone.accessToken)).status).toBe(200);
    expect((await postRefreshToken(app, newPhone.refreshToken)).status).toBe(200);
  });
});
