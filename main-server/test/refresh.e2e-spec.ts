import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { newGoogleSubject } from './google.js';
import { getMe, postRefreshToken, refresh, refreshTokenHash, signIn, tokensSchema } from './sign-in.js';
import { startApp } from './start-app.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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

// Moves the stored expiry of a refresh token, as if it had been issued at another time.
async function setExpiry(refreshToken: string, expiresAt: Date): Promise<void> {
  await prisma.refreshToken.update({ where: { tokenHash: refreshTokenHash(refreshToken) }, data: { expiresAt } });
}

const refused = { message: 'The refresh token is invalid, expired or revoked.' };

describe('Refresh', () => {
  it('exchanges a refresh token for a new access token and a new refresh token of the same User', async () => {
    const signedIn = await signIn(app);

    const response = await postRefreshToken(app, signedIn.refreshToken);

    expect(response.status).toBe(200);
    const renewed = tokensSchema.parse(response.body);
    expect(renewed.refreshToken).not.toBe(signedIn.refreshToken);
    const me = await getMe(app, renewed.accessToken);
    expect(me.status).toBe(200);
    expect(me.body).toEqual((await getMe(app, signedIn.accessToken)).body);
  });

  it('refuses the refresh token once it has been exchanged', async () => {
    const { refreshToken } = await signIn(app);
    await refresh(app, refreshToken);

    const response = await postRefreshToken(app, refreshToken);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(refused);
  });

  it('keeps the User signed in from one refresh to the next', async () => {
    const renewed = await refresh(app, (await signIn(app)).refreshToken);

    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(200);
  });

  it('stores the new refresh token hashed and valid for 30 days from the refresh', async () => {
    const { refreshToken } = await signIn(app);
    // As if the User had signed in 29 days ago: the new token's 30 days count from the refresh.
    await setExpiry(refreshToken, new Date(Date.now() + DAY_MS));
    const refreshedAt = Date.now();

    const renewed = await refresh(app, refreshToken);

    const stored = await prisma.refreshToken.findUniqueOrThrow({
      where: { tokenHash: refreshTokenHash(renewed.refreshToken) },
    });
    const lifetime = stored.expiresAt.getTime() - refreshedAt;
    expect(lifetime).toBeGreaterThanOrEqual(30 * DAY_MS);
    expect(lifetime).toBeLessThan(30 * DAY_MS + 60_000);
  });
});

describe('Refresh refused', () => {
  it('refuses an expired refresh token', async () => {
    const { refreshToken } = await signIn(app);
    await setExpiry(refreshToken, new Date(Date.now() - 1000));

    const response = await postRefreshToken(app, refreshToken);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(refused);
  });

  it('refuses an unknown refresh token', async () => {
    const response = await postRefreshToken(app, randomBytes(32).toString('base64url'));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(refused);
  });

  it('refuses a request without a refresh token and names the field', async () => {
    const response = await request(app.getHttpServer()).post('/auth/refresh').send({});

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('refreshToken');
  });
});

// Whoever holds the other copy of a used refresh token may have stolen it.
describe('A refresh token used twice', () => {
  it('revokes the tokens that replaced it', async () => {
    const { refreshToken } = await signIn(app);
    const renewed = await refresh(app, refreshToken);
    await postRefreshToken(app, refreshToken);

    const response = await postRefreshToken(app, renewed.refreshToken);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(refused);
  });

  it("keeps the User's other sign-ins", async () => {
    const sub = newGoogleSubject();
    const otherPhone = await signIn(app, { sub });
    const { refreshToken } = await signIn(app, { sub });
    await refresh(app, refreshToken);

    await postRefreshToken(app, refreshToken);

    expect((await postRefreshToken(app, otherPhone.refreshToken)).status).toBe(200);
  });

  it('lets one of several refreshes at the same moment succeed and revokes what it got', async () => {
    const { refreshToken } = await signIn(app);
    // The server opens database connections as requests need them. Opening one takes longer than a whole refresh, so
    // simultaneous sign-ins open them first; otherwise the refreshes would reach the database one after another.
    await Promise.all(Array.from({ length: 10 }, () => signIn(app)));

    const responses = await Promise.all(Array.from({ length: 10 }, () => postRefreshToken(app, refreshToken)));

    const statuses = responses.map(({ status }) => status);
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    expect(statuses.filter((status) => status === 401)).toHaveLength(9);
    const renewed = tokensSchema.parse(responses[statuses.indexOf(200)]?.body);
    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(401);
  });
});
