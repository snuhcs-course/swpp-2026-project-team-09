import { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { redisSettings, startRedis } from './containers.js';
import { googleIdToken, googleSubject } from './google.js';
import { overlap } from './overlap.js';
import { getMe, postRefreshToken, refresh, sessionOf, signIn, tokensSchema } from './sign-in.js';
import { startApp } from './start-app.js';

const HOUR = 60 * 60;

const settings = inject('settings');
let app: INestApplication<Server>;
let prisma: PrismaClient;
let redis: Redis;
// NestJS messaging publishes each event on a Redis channel named after it.
let messaging: Redis;
const events: unknown[] = [];

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
  redis = new Redis({ host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) });
  messaging = redis.duplicate();
  messaging.on('message', (_channel: string, message: string) => {
    events.push(JSON.parse(message));
  });
  await messaging.subscribe('session-ended');
});

afterAll(async () => {
  await Promise.all([messaging.quit(), redis.quit(), prisma.$disconnect()]);
  await app.close();
});

async function expectSocketServerTold(sessionId: string, end: string): Promise<void> {
  await vi.waitFor(() => {
    expect(events).toContainEqual({ pattern: 'session-ended', data: { sessionId, end } });
  });
  expect(await redis.get(`ended-session:${sessionId}`)).toBe(end);
  const ttl = await redis.ttl(`ended-session:${sessionId}`);
  expect(ttl).toBeGreaterThan(HOUR - 60);
  expect(ttl).toBeLessThanOrEqual(HOUR);
}

const replaced = { statusCode: 401, code: 'SESSION_REPLACED' };

describe('A session', () => {
  it('is kept by a refresh', async () => {
    const signedIn = await signIn(app);

    const renewed = await refresh(app, signedIn.refreshToken);

    expect(sessionOf(renewed.accessToken)).toBe(sessionOf(signedIn.accessToken));
  });
});

describe('A sign-in on another phone', () => {
  it("ends the first phone's session: its refresh token is refused", async () => {
    const sub = googleSubject();
    const firstPhone = await signIn(app, { sub });

    await signIn(app, { sub });

    expect((await postRefreshToken(app, firstPhone.refreshToken)).status).toBe(401);
  });

  it("refuses the first phone's access tokens from the next request on, with a code that says why", async () => {
    const sub = googleSubject();
    const signedIn = await signIn(app, { sub });
    const renewed = await refresh(app, signedIn.refreshToken);

    await signIn(app, { sub });

    const responses = await Promise.all([signedIn, renewed].map(({ accessToken }) => getMe(app, accessToken)));
    for (const response of responses) {
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject(replaced);
    }
  });

  it('starts a session that works', async () => {
    const sub = googleSubject();
    await refresh(app, (await signIn(app, { sub })).refreshToken);

    const secondPhone = await signIn(app, { sub });

    expect((await getMe(app, secondPhone.accessToken)).status).toBe(200);
    expect((await postRefreshToken(app, secondPhone.refreshToken)).status).toBe(200);
  });

  it('leaves the Master Switch as it is', async () => {
    const sub = googleSubject();
    await signIn(app, { sub });
    // Turning it on belongs to P06 and P08, so the test turns it on in the database.
    await prisma.user.update({ where: { googleSubject: sub }, data: { masterSwitch: true } });

    await signIn(app, { sub });

    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: sub } });
    expect(user.masterSwitch).toBe(true);
  });
});

describe('A sign-in during a refresh on the other phone', () => {
  it("leaves only the sign-in's session", async () => {
    const sub = googleSubject();
    const firstPhone = await signIn(app, { sub });

    const [refreshed, signedIn] = await overlap(
      prisma,
      firstPhone.refreshToken,
      () => postRefreshToken(app, firstPhone.refreshToken),
      () =>
        request(app.getHttpServer())
          .post('/auth/google')
          .send({ idToken: googleIdToken({ sub }) }),
    );

    expect(refreshed.status).toBe(200);
    expect(signedIn.status).toBe(200);
    const renewed = tokensSchema.parse(refreshed.body);
    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(401);
    expect((await getMe(app, renewed.accessToken)).body).toMatchObject(replaced);
    const secondPhone = tokensSchema.parse(signedIn.body);
    expect((await getMe(app, secondPhone.accessToken)).status).toBe(200);
    expect((await postRefreshToken(app, secondPhone.refreshToken)).status).toBe(200);
  });
});

describe('The socket server', () => {
  it('is told that a sign-in on another phone replaced the session', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });

    await signIn(app, { sub });

    await expectSocketServerTold(sessionOf(accessToken), 'replaced');
  });

  it('is told that a sign-out ended the session', async () => {
    const { accessToken } = await signIn(app);

    await request(app.getHttpServer()).post('/auth/sign-out').auth(accessToken, { type: 'bearer' });

    await expectSocketServerTold(sessionOf(accessToken), 'ended');
  });
});

// Starts its own Redis and stops it once the User has signed in, so that the shared Redis stays up.
describe("A User's route with Redis down", () => {
  let appWithoutRedis: INestApplication<Server>;
  let accessToken: string;

  beforeAll(async () => {
    const ownRedis = await startRedis();
    appWithoutRedis = await startApp({ ...settings, ...redisSettings(ownRedis) });
    ({ accessToken } = await signIn(appWithoutRedis));
    await ownRedis.stop();
  });

  afterAll(async () => {
    await appWithoutRedis.close();
  });

  it('answers 503, because it cannot tell whether the session has ended', async () => {
    const response = await getMe(appWithoutRedis, accessToken);

    expect(response.status).toBe(503);
  });
});
