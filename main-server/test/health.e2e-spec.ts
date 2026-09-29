import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { mainDatabaseUrl, migrate, redisSettings, startPostgres, startRedis } from './containers.js';
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

// The cases below start their own store and stop it once the server is running, so the shared stores stay up.

describe('Health checks with Redis down', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const redis = await startRedis();
    app = await startApp({ ...inject('settings'), ...redisSettings(redis) });
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
    const postgres = await startPostgres();
    // The server registers the initial Administrators when it starts, so the database needs its schema.
    migrate(mainDatabaseUrl(postgres));
    app = await startApp({ ...inject('settings'), DATABASE_URL: mainDatabaseUrl(postgres) });
    await postgres.stop();
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
