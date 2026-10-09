// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #14 #16
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { startProxy } from './proxy.js';
import { startApp } from './start-app.js';

describe('Health checks with the database and Redis up', () => {
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

  it('reports the database and Redis as ready', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
    });
  });
});

// The cases below reach one shared store through a proxy and stop the proxy once the server is running, so that the
// store stays up for the other test files.

describe('Health checks with Redis down', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const settings = inject('settings');
    const redis = await startProxy(settings.REDIS_HOST, Number(settings.REDIS_PORT));
    app = await startApp({ ...settings, REDIS_HOST: '127.0.0.1', REDIS_PORT: String(redis.port) });
    await redis.stop();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports not ready and names Redis', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      status: 'error',
      info: { database: { status: 'up' } },
      error: { redis: { status: 'down' } },
    });
  });

  it('still answers the liveness check', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
  });
});

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
    expect(response.body).toMatchObject({
      status: 'error',
      info: { redis: { status: 'up' } },
      error: { database: { status: 'down' } },
    });
  });

  it('still answers the liveness check', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
  });
});
