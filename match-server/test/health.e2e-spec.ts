import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { startProxy } from './proxy.js';
import { startApp } from './start-app.js';

describe('Health checks with the database up', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    app = await startApp(inject('settings'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers the liveness check', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('reports the database as ready', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });
});

// The server reaches the shared database through a proxy, which stops once the server is running, so that the
// database stays up for the other test files.
describe('Health checks with the database down', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const settings = inject('settings');
    const databaseUrl = new URL(settings.DATABASE_URL);
    const database = await startProxy(databaseUrl.hostname, Number(databaseUrl.port));
    databaseUrl.hostname = '127.0.0.1';
    databaseUrl.port = String(database.port);
    app = await startApp({ ...settings, DATABASE_URL: databaseUrl.toString() });
    await database.stop();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports not ready and names the database', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'error', error: { database: { status: 'down' } } });
  });

  it('still answers the liveness check', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
  });
});
