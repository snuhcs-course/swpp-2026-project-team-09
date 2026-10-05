import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { lastValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let url: string;
const openSockets: Socket[] = [];
// Sends signals as the main server does.
let mainServer: ClientProxy;

beforeAll(async () => {
  app = await startApp(settings);
  url = await app.getUrl();
  mainServer = ClientProxyFactory.create({
    transport: Transport.REDIS,
    options: { host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) },
  });
  await mainServer.connect();
});

afterEach(() => {
  for (const socket of openSockets.splice(0)) {
    socket.close();
  }
});

afterAll(async () => {
  await mainServer.close();
  await app.close();
});

// Connects as the User's app does, in a session of its own, so that one User can have several connections.
function connectAs(userId: string): Promise<Socket> {
  const token = new JwtService().sign(
    { sub: userId, sid: randomUUID() },
    { privateKey: inject('accessTokenPrivateKey'), algorithm: 'ES256', audience: 'snu-now-app', expiresIn: '1h' },
  );
  const socket = io(url, { auth: { token } });
  openSockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => {
      resolve(socket);
    });
    socket.once('connect_error', reject);
  });
}

async function sendSignal(signal: { userIds?: string[]; name: string; payload?: unknown }): Promise<void> {
  await lastValueFrom(mainServer.emit('signal', signal), { defaultValue: undefined });
}

// Collects what each socket receives under the signal's name, as the arguments of each emit.
function record(sockets: Socket[], name: string): unknown[][][] {
  return sockets.map((socket) => {
    const received: unknown[][] = [];
    socket.on(name, (...args: unknown[]) => {
      received.push(args);
    });
    return received;
  });
}

// Signals from one publisher arrive in order, so once the last reaches a socket the earlier ones have come or never will.
async function sendMarker(socket: Socket, userId: string): Promise<void> {
  const name = `marker-${randomUUID()}`;
  const arrived = new Promise((resolve) => {
    socket.once(name, resolve);
  });
  await sendSignal({ userIds: [userId], name });
  await arrived;
}

describe('A signal for some Users', () => {
  it('reaches every connection of each User it names, under its name, with what it carries', async () => {
    const [named, alsoNamed] = [randomUUID(), randomUUID()];
    const sockets = await Promise.all([connectAs(named), connectAs(named), connectAs(alsoNamed)]);
    const received = record(sockets, 'position');
    const payload = { userId: named, latitude: 37.46 };

    await sendSignal({ userIds: [named, alsoNamed], name: 'position', payload });

    await vi.waitFor(() => {
      expect(received).toEqual([[[payload]], [[payload]], [[payload]]]);
    });
  });

  it('carries nothing when the main server gives it nothing', async () => {
    const userId = randomUUID();
    const socket = await connectAs(userId);
    const [received] = record([socket], 'friends-changed');

    await sendSignal({ userIds: [userId], name: 'friends-changed' });

    await vi.waitFor(() => {
      expect(received).toEqual([[]]);
    });
  });

  it('reaches no connection of another User', async () => {
    const [named, other] = [randomUUID(), randomUUID()];
    const [, otherSocket] = await Promise.all([connectAs(named), connectAs(other)]);
    const [received] = record([otherSocket], 'friends-changed');

    await sendSignal({ userIds: [named], name: 'friends-changed' });
    await sendMarker(otherSocket, other);

    expect(received).toEqual([]);
  });

  it('that names an empty list of Users reaches nobody', async () => {
    const userId = randomUUID();
    const socket = await connectAs(userId);
    const [received] = record([socket], 'friends-changed');

    await sendSignal({ userIds: [], name: 'friends-changed' });
    await sendMarker(socket, userId);

    expect(received).toEqual([]);
  });
});

describe('A position', () => {
  it('reaches the viewer it names and no other connection', async () => {
    const [subject, viewer, other] = [randomUUID(), randomUUID(), randomUUID()];
    const sockets = await Promise.all([connectAs(subject), connectAs(viewer), connectAs(other)]);
    const [subjectSocket, , otherSocket] = sockets;
    const [subjectReceived, viewerReceived, otherReceived] = record(sockets, 'position');
    const position = { userId: subject, latitude: 37.4594, longitude: 126.95199, measuredAt: new Date().toISOString() };

    await sendSignal({ userIds: [viewer], name: 'position', payload: position });
    await Promise.all([sendMarker(subjectSocket, subject), sendMarker(otherSocket, other)]);

    await vi.waitFor(() => {
      expect(viewerReceived).toEqual([[position]]);
    });
    expect(subjectReceived).toEqual([]);
    expect(otherReceived).toEqual([]);
  });
});

describe('A signal that names no Users', () => {
  it('reaches every connection', async () => {
    const sockets = await Promise.all([connectAs(randomUUID()), connectAs(randomUUID())]);
    const received = record(sockets, 'global-events-changed');

    await sendSignal({ name: 'global-events-changed' });

    await vi.waitFor(() => {
      expect(received).toEqual([[[]], [[]]]);
    });
  });
});
