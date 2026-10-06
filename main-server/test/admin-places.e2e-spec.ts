import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { signIn, signInAsAdministrator } from './sign-in.js';
import { startApp } from './start-app.js';

// The global setup loaded the seed into the shared database.

let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(inject('settings'));
});

afterAll(async () => {
  await app.close();
});

describe("An Administrator's list of Places", () => {
  it("answers every Place in the order and form of a User's list", async () => {
    const administrator = await signInAsAdministrator(app);
    const user = await signIn(app);

    const response = await request(app.getHttpServer())
      .get('/admin/places')
      .auth(administrator.accessToken, { type: 'bearer' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(230);
    expect(response.body).toEqual(
      (await request(app.getHttpServer()).get('/places').auth(user.accessToken, { type: 'bearer' })).body,
    );
  });
});
