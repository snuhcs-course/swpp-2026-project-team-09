/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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
// Sends events as the main server does.
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

afterAll(async () => {
  for (const socket of openSockets.splice(0)) {
    socket.close();
  }
  await mainServer.close();
  await app.close();
});

// Connects as a User's app does, with an access token of a User of its own.
function connectAsUser(): Promise<Socket> {
  const token = new JwtService().sign(
    { sub: randomUUID(), sid: randomUUID() },
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

function nextEvent(socket: Socket, event: string): Promise<unknown> {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

// A set of vehicles as the main server sends it once it has stored them: two at one stop.
const newMaterials = {
  id: randomUUID(),
  name: '신소재공동연구소',
  latitude: 37.4535571226189,
  longitude: 126.950220492609,
};
const vehicles = [
  {
    carId: '4522',
    stop: { id: randomUUID(), name: '정문', latitude: 37.4656884925184, longitude: 126.948449058974 },
    receivedAt: '2026-10-02T06:40:07.000Z',
  },
  { carId: '4521', stop: newMaterials, receivedAt: '2026-10-02T06:40:07.000Z' },
  { carId: '4531', stop: newMaterials, receivedAt: '2026-10-02T06:40:07.000Z' },
];

describe('The vehicles the main server has stored', () => {
  it('reach every connected app, each vehicle with its stop, the coordinates and the time received', async () => {
    const apps = await Promise.all([connectAsUser(), connectAsUser()]);
    const received = Promise.all(apps.map((socket) => nextEvent(socket, 'shuttle-vehicles-updated')));

    await lastValueFrom(mainServer.emit('shuttle-vehicles-updated', vehicles), { defaultValue: undefined });

    expect(await received).toEqual([vehicles, vehicles]);
  });
});
