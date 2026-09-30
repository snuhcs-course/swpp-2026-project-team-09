import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { googleSubject } from './google.js';
import { overlap } from './overlap.js';
import { startProxy } from './proxy.js';
import {
  getMe,
  postRefreshToken,
  postSignIn,
  postSignOut,
  refresh,
  sessionOf,
  signIn,
  signInResultSchema,
  tokensSchema,
  useLongAgo,
} from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let prisma: PrismaClient;
// NestJS messaging publishes each event on a Redis channel named after it.
let messaging: Redis;
const events: unknown[] = [];

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
  messaging = new Redis({ host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) });
  messaging.on('message', (_channel: string, message: string) => {
    events.push(JSON.parse(message));
  });
  await messaging.subscribe('session-ended');
});

afterAll(async () => {
  await Promise.all([messaging.quit(), prisma.$disconnect()]);
  await app.close();
});

async function expectSocketServerTold(sessionId: string, reason: string): Promise<void> {
  await vi.waitFor(() => {
    expect(events).toContainEqual({ pattern: 'session-ended', data: { sessionId, reason } });
  });
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
});

describe('A sign-in during a refresh on the other phone', () => {
  it("leaves only the sign-in's session", async () => {
    const sub = googleSubject();
    const firstPhone = await signIn(app, { sub });

    const [refreshed, signedIn] = await overlap(
      prisma,
      firstPhone.refreshToken,
      () => postRefreshToken(app, firstPhone.refreshToken),
      () => postSignIn(app, { sub }),
    );

    expect(refreshed.status).toBe(200);
    expect(signedIn.status).toBe(200);
    const renewed = tokensSchema.parse(refreshed.body);
    expect((await postRefreshToken(app, renewed.refreshToken)).status).toBe(401);
    expect((await getMe(app, renewed.accessToken)).body).toMatchObject(replaced);
    const secondPhone = signInResultSchema.parse(signedIn.body);
    expect((await getMe(app, secondPhone.accessToken)).status).toBe(200);
    expect((await postRefreshToken(app, secondPhone.refreshToken)).status).toBe(200);
  });
});

describe('Sign-ins on two phones at the same moment', () => {
  it('leave one session, that of the sign-in that comes last', async () => {
    const sub = googleSubject();
    const { refreshToken } = await signIn(app, { sub });

    const [first, second] = await overlap(
      prisma,
      refreshToken,
      () => postSignIn(app, { sub }),
      () => postSignIn(app, { sub }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await getMe(app, signInResultSchema.parse(first.body).accessToken)).body).toMatchObject(replaced);
    expect((await getMe(app, signInResultSchema.parse(second.body).accessToken)).status).toBe(200);
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

    await postSignOut(app, accessToken);

    await expectSocketServerTold(sessionOf(accessToken), 'signed_out');
  });

  it('is told that a used refresh token ended the session', async () => {
    const { accessToken, refreshToken } = await signIn(app);
    await refresh(app, refreshToken);
    await useLongAgo(prisma, refreshToken);

    await postRefreshToken(app, refreshToken);

    await expectSocketServerTold(sessionOf(accessToken), 'refresh_token_reused');
  });
});

describe('An access token without a session', () => {
  it('is refused', async () => {
    const withoutSession = new JwtService().sign(
      { sub: randomUUID() },
      { privateKey: settings.ACCESS_TOKEN_PRIVATE_KEY, algorithm: 'ES256', audience: 'snu-now-app', expiresIn: '1h' },
    );

    expect((await getMe(app, withoutSession)).status).toBe(401);
  });
});

// Reaches the shared Redis through a proxy and stops the proxy once the server is running, so that Redis stays up for
// the other test files.
describe('Sessions with Redis down', () => {
  let appWithoutRedis: INestApplication<Server>;

  beforeAll(async () => {
    const redis = await startProxy(settings.REDIS_HOST, Number(settings.REDIS_PORT));
    appWithoutRedis = await startApp({ ...settings, REDIS_HOST: '127.0.0.1', REDIS_PORT: String(redis.port) });
    await redis.stop();
  });

  afterAll(async () => {
    await appWithoutRedis.close();
  });

  it('are kept in the database: a sign-in, its requests and its sign-out work', async () => {
    const { accessToken } = await signIn(appWithoutRedis);

    expect((await getMe(appWithoutRedis, accessToken)).status).toBe(200);
    expect((await postSignOut(appWithoutRedis, accessToken)).status).toBe(204);
    expect((await getMe(appWithoutRedis, accessToken)).status).toBe(401);
  });
});
