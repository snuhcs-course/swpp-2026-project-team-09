import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { io, Socket } from 'socket.io-client';
import { inject } from 'vitest';
import { es256KeyPair } from './keys.js';
import { startApp } from './start-app.js';

const HOUR = 60 * 60;

const privateKey = inject('accessTokenPrivateKey');
let app: INestApplication<Server>;
let url: string;
const openSockets: Socket[] = [];

beforeAll(async () => {
  app = await startApp(inject('settings'));
  // On a free port, so that the tests connect over the network as the app does.
  await app.listen(0);
  url = await app.getUrl();
});

afterEach(() => {
  for (const socket of openSockets.splice(0)) {
    socket.close();
  }
});

afterAll(async () => {
  await app.close();
});

// An access token as the main server signs it for a User: ES256, the User's id as the subject, for the app, valid for 1
// hour.
function accessToken(userId: string): string {
  return new JwtService().sign(
    { sub: userId },
    { privateKey, algorithm: 'ES256', audience: 'snu-now-app', expiresIn: '1h' },
  );
}

// Opens a Socket.IO connection as the app does. Resolves once the server accepts it, and rejects with the server's
// error when it refuses.
function connect(auth: { token?: string } = {}): Promise<Socket> {
  const socket = io(url, { auth });
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
    // As the main server signs it for an Administrator: for the administrative routes, valid for 8 hours.
    const administratorToken = new JwtService().sign(
      { sub: randomUUID() },
      { privateKey, algorithm: 'ES256', audience: 'snu-now-admin', expiresIn: '8h' },
    );

    await expect(connect({ token: administratorToken })).rejects.toThrow('Unauthorized');
  });
});
