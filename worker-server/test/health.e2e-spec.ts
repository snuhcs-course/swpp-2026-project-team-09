import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { redisSettings, startRedis } from './containers.js';
import { startApp } from './start-app.js';

describe('Health checks with Redis up', () => {
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

  it('reports Redis as ready', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      info: { redis: { status: 'up' } },
    });
  });
});

// The tests below start their own Redis and stop it once the server is running, so the shared Redis stays up.

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
      error: { redis: { status: 'down' } },
    });
  });

  it('still answers the liveness check', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
  });
});
