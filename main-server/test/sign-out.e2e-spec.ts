import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { googleSubject } from './google.js';
import { overlap } from './overlap.js';
import { getMe, postRefreshToken, refresh, signIn, tokensSchema } from './sign-in.js';
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

function postSignOut(accessToken?: string): request.Test {
  const post = request(app.getHttpServer()).post('/auth/sign-out');
  return accessToken === undefined ? post : post.auth(accessToken, { type: 'bearer' });
}

describe('Sign-out', () => {
  it('revokes every refresh token of the User', async () => {
    const sub = googleSubject();
    // Refreshed since the sign-in, so that the session has a used token and the one that replaced it.
    const { accessToken, refreshToken } = await refresh(app, (await signIn(app, { sub })).refreshToken);

    const response = await postSignOut(accessToken);

    expect(response.status).toBe(204);
    expect((await postRefreshToken(app, refreshToken)).status).toBe(401);
    const unrevoked = await prisma.refreshToken.count({ where: { user: { googleSubject: sub }, revokedAt: null } });
    expect(unrevoked).toBe(0);
  });

  it("keeps other Users' refresh tokens", async () => {
    const other = await signIn(app);

    await postSignOut((await signIn(app)).accessToken);

    expect((await postRefreshToken(app, other.refreshToken)).status).toBe(200);
  });

  it("refuses the session's access token from the next request on, a second sign-out included", async () => {
    const { accessToken } = await signIn(app);

    await postSignOut(accessToken);

    for (const response of [await getMe(app, accessToken), await postSignOut(accessToken)]) {
      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('code');
    }
  });

  it('refuses a request without an access token', async () => {
    const response = await postSignOut();

    expect(response.status).toBe(401);
  });
});

// The app refreshes its tokens while the User signs out, and both reach the database at the same moment.
describe('Sign-out during a refresh', () => {
  it('revokes the token the refresh stores', async () => {
    const { accessToken, refreshToken } = await signIn(app);

    const [refreshed, signedOut] = await overlap(
      prisma,
      refreshToken,
      () => postRefreshToken(app, refreshToken),
      () => postSignOut(accessToken),
    );

    expect(refreshed.status).toBe(200);
    expect(signedOut.status).toBe(204);
    const renewed = tokensSchema.parse(refreshed.body);
    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(401);
  });
});

describe('Master Switch', () => {
  it('is off when the User is created', async () => {
    const sub = googleSubject();

    await signIn(app, { sub });

    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } });
    expect(user.masterSwitch).toBe(false);
  });

  it('is turned off by sign-out', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    // Turning it on belongs to P06 and P08, so the test turns it on in the database.
    await prisma.user.update({ where: { googleSubject: sub }, data: { masterSwitch: true } });

    expect((await postSignOut(accessToken)).status).toBe(204);

    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } });
    expect(user.masterSwitch).toBe(false);
  });
});
