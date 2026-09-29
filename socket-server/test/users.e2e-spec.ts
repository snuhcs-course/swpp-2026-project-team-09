import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { lastValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { inject } from 'vitest';
import { redisSettings, startRedis } from './containers.js';
import { es256KeyPair } from './keys.js';
import { startApp } from './start-app.js';

const HOUR = 60 * 60;

const settings = inject('settings');
const privateKey = inject('accessTokenPrivateKey');
let app: INestApplication<Server>;
let url: string;
const openSockets: Socket[] = [];
// The tests end sessions as the main server does.
let redis: Redis;
let mainServer: ClientProxy;

beforeAll(async () => {
  app = await startApp(settings);
  // On a free port, so that the tests connect over the network as the app does.
  await app.listen(0);
  url = await app.getUrl();
  const redisOptions = { host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) };
  redis = new Redis(redisOptions);
  mainServer = ClientProxyFactory.create({ transport: Transport.REDIS, options: redisOptions });
  await mainServer.connect();
});

afterEach(() => {
  for (const socket of openSockets.splice(0)) {
    socket.close();
  }
});

afterAll(async () => {
  await mainServer.close();
  await redis.quit();
  await app.close();
});

// An access token as the main server signs it: ES256, the User's id as the subject, the session, valid for 1 hour.
function accessToken(userId: string, sessionId = randomUUID()): string {
  return new JwtService().sign(
    { sub: userId, sid: sessionId },
    { privateKey, algorithm: 'ES256', audience: 'snu-now-app', expiresIn: '1h' },
  );
}

async function endSession(sessionId: string, end: 'replaced' | 'ended'): Promise<void> {
  await redis.set(`ended-session:${sessionId}`, end, 'EX', HOUR);
  await lastValueFrom(mainServer.emit('session-ended', { sessionId, end }), { defaultValue: undefined });
}

function nextEvent(socket: Socket, event: string): Promise<unknown> {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

// Opens a Socket.IO connection as the app does. Resolves once the server accepts it, and rejects with the server's
// error when it refuses.
function connect(auth: { token?: string } = {}, serverUrl = url): Promise<Socket> {
  const socket = io(serverUrl, { auth });
  openSockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => {
      resolve(socket);
    });
    socket.once('connect_error', reject);
  });
}

// The User each open connection belongs to, by socket id, as the socket server holds it.
async function connectionUsers(): Promise<Map<string, unknown>> {
  // Imported after startApp, so that it is the same class AppModule registers.
  const { UsersGateway } = await import('../src/users/users.gateway.js');
  const sockets = await app.get(UsersGateway).server.fetchSockets();
  return new Map(sockets.map((socket) => [socket.id, socket.data.user]));
}

describe('A socket connection', () => {
  it('is accepted with a valid access token and belongs to its User', async () => {
    const userId = randomUUID();

    const socket = await connect({ token: accessToken(userId) });

    expect((await connectionUsers()).get(socket.id ?? '')).toEqual({ id: userId });
  });

  it('is refused without an access token', async () => {
    await expect(connect()).rejects.toThrow('Unauthorized');
  });

  it('is refused with an expired access token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = new JwtService().sign(
      { sub: randomUUID(), aud: 'snu-now-app', iat: now - 2 * HOUR, exp: now - HOUR },
      { privateKey, algorithm: 'ES256' },
    );

    await expect(connect({ token: expired })).rejects.toThrow('Unauthorized');
  });

  it('is refused with an altered access token', async () => {
    const [header, , signature] = accessToken(randomUUID()).split('.');
    // Another User's claims under the first token's signature.
    const [, otherPayload] = accessToken(randomUUID()).split('.');

    await expect(connect({ token: `${header}.${otherPayload}.${signature}` })).rejects.toThrow('Unauthorized');
  });

  it('is refused with an access token signed with another key', async () => {
    const forged = new JwtService().sign(
      { sub: randomUUID() },
      { privateKey: es256KeyPair().privateKey, algorithm: 'ES256', audience: 'snu-now-app', expiresIn: '1h' },
    );

    await expect(connect({ token: forged })).rejects.toThrow('Unauthorized');
  });

  it("is refused with an Administrator's access token", async () => {
    const administratorToken = new JwtService().sign(
      { sub: randomUUID() },
      { privateKey, algorithm: 'ES256', audience: 'snu-now-admin', expiresIn: '8h' },
    );

    await expect(connect({ token: administratorToken })).rejects.toThrow('Unauthorized');
  });
});

describe('A new connection of an ended session', () => {
  it('is refused with a code that says a sign-in on another phone replaced the session', async () => {
    const sessionId = randomUUID();
    await endSession(sessionId, 'replaced');

    const refused = connect({ token: accessToken(randomUUID(), sessionId) });

    await expect(refused).rejects.toThrow('Unauthorized');
    await expect(refused).rejects.toMatchObject({ data: { code: 'SESSION_REPLACED' } });
  });

  it('is refused without a code when a sign-out or a used refresh token ended the session', async () => {
    const sessionId = randomUUID();
    await endSession(sessionId, 'ended');

    const refused = connect({ token: accessToken(randomUUID(), sessionId) });

    await expect(refused).rejects.toThrow('Unauthorized');
    await expect(refused).rejects.not.toHaveProperty('data.code');
  });
});

describe('An open connection whose session ends', () => {
  it('is told that a sign-in on another phone replaced the session and disconnected', async () => {
    const sessionId = randomUUID();
    const socket = await connect({ token: accessToken(randomUUID(), sessionId) });
    const told = nextEvent(socket, 'session-ended');
    const disconnected = nextEvent(socket, 'disconnect');

    await endSession(sessionId, 'replaced');

    expect(await told).toEqual({ code: 'SESSION_REPLACED' });
    expect(await disconnected).toBe('io server disconnect');
  });

  it('is told without a code when a sign-out or a used refresh token ended the session', async () => {
    const sessionId = randomUUID();
    const socket = await connect({ token: accessToken(randomUUID(), sessionId) });
    const told = nextEvent(socket, 'session-ended');
    const disconnected = nextEvent(socket, 'disconnect');

    await endSession(sessionId, 'ended');

    expect(await told).toEqual({});
    expect(await disconnected).toBe('io server disconnect');
  });

  it('leaves the connections of other sessions open', async () => {
    const sessionId = randomUUID();
    const other = await connect({ token: accessToken(randomUUID()) });
    const disconnected = nextEvent(await connect({ token: accessToken(randomUUID(), sessionId) }), 'disconnect');

    await endSession(sessionId, 'ended');

    await disconnected;
    expect((await connectionUsers()).has(other.id ?? '')).toBe(true);
  });
});

// Starts its own Redis and stops it once the server is running, so that the shared Redis stays up.
describe('A connection with Redis down', () => {
  let appWithoutRedis: INestApplication<Server>;
  let urlWithoutRedis: string;

  beforeAll(async () => {
    const ownRedis = await startRedis();
    appWithoutRedis = await startApp({ ...settings, ...redisSettings(ownRedis) });
    await appWithoutRedis.listen(0);
    urlWithoutRedis = await appWithoutRedis.getUrl();
    await ownRedis.stop();
  });

  afterAll(async () => {
    await appWithoutRedis.close();
  });

  it('is refused as unavailable, because the server cannot tell whether the session has ended', async () => {
    await expect(connect({ token: accessToken(randomUUID()) }, urlWithoutRedis)).rejects.toThrow('Service Unavailable');
  });
});
