/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

// Production's load balancer refuses every path under /admin/ from the internet, and its path patterns are
// case-sensitive, so a route must not answer at its path in another case.
describe('Routes and the case of their paths', () => {
  it('lists the Administrators at /admin/administrators and at no other case of it', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    const lower = await request(app.getHttpServer()).get('/admin/administrators').auth(accessToken, { type: 'bearer' });
    const upper = await request(app.getHttpServer()).get('/ADMIN/administrators').auth(accessToken, { type: 'bearer' });

    expect(lower.status).toBe(200);
    expect(lower.body).toEqual(expect.arrayContaining([expect.objectContaining({ email: 'admin@example.com' })]));
    expect(upper.status).toBe(404);
  });
});
