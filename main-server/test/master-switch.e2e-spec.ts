import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { signInUser } from './friends.js';
import { googleSubject } from './google.js';
import { setMasterSwitch } from './location-sharing.js';
import { postSignOut, signIn, withAccessToken } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

// As the lobby returns it.
async function masterSwitchOf(accessToken: string): Promise<boolean> {
  const response = await withAccessToken(request(app.getHttpServer()).post('/lobby'), accessToken);
  expect(response.status).toBe(200);
  return z.object({ masterSwitch: z.boolean() }).parse(response.body).masterSwitch;
}

describe('The Master Switch', () => {
  it('starts off, and the lobby returns it', async () => {
    const user = await signInUser(app);

    expect(await masterSwitchOf(user.accessToken)).toBe(false);
  });

  it('is turned on and off by the User', async () => {
    const user = await signInUser(app);

    expect((await setMasterSwitch(app, user, true)).status).toBe(204);
    expect(await masterSwitchOf(user.accessToken)).toBe(true);

    expect((await setMasterSwitch(app, user, false)).status).toBe(204);
    expect(await masterSwitchOf(user.accessToken)).toBe(false);
  });

  it('is left as it is by signing out and signing in again', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    await setMasterSwitch(app, { accessToken }, true);

    await postSignOut(app, accessToken);
    const again = await signIn(app, { sub });

    expect(await masterSwitchOf(again.accessToken)).toBe(true);
  });

  it('refuses a body without a yes or no', async () => {
    const user = await signInUser(app);

    const response = await withAccessToken(
      request(app.getHttpServer()).put('/users/me/master-switch'),
      user.accessToken,
    ).send({ on: 'yes' });

    expect(response.status).toBe(400);
  });
});
