import { Controller, Get, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AdministratorOnly } from '../src/common/administrator-only.decorator.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

// No feature has an administrative route yet (P12 adds them), so these tests mark a route of their own.
// test/administrative-controller.e2e-spec.ts marks a whole controller.
@Controller('administrative-route')
class AdministrativeRouteController {
  @Get()
  @AdministratorOnly()
  read(): string {
    return 'Only an Administrator reads this.';
  }
}

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp({ ...settings, ADMINISTRATOR_EMAILS: 'admin@snu.ac.kr, Second-Admin@SNU.ac.kr' }, [
    AdministrativeRouteController,
  ]);
});

afterAll(async () => {
  await app.close();
});

function get(path: string, accessToken?: string): request.Test {
  const test = request(app.getHttpServer()).get(path);
  return accessToken === undefined ? test : test.auth(accessToken, { type: 'bearer' });
}

describe('An administrative route', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    expect((await get('/administrative-route', accessToken)).status).toBe(200);
  });

  it('recognises an address on the list whatever its case', async () => {
    const { accessToken } = await signIn(app, { email: 'SECOND-ADMIN@snu.ac.kr' });

    expect((await get('/administrative-route', accessToken)).status).toBe(200);
  });

  it('refuses another signed-in User with 403 and says so', async () => {
    const { accessToken } = await signIn(app, { email: 'student@snu.ac.kr' });

    const response = await get('/administrative-route', accessToken);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Only an Administrator can use this route.' });
  });

  it('refuses a request without an access token with 401', async () => {
    expect((await get('/administrative-route')).status).toBe(401);
  });

  it('refuses the access token of an Administrator taken off the list', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });
    expect((await get('/administrative-route', accessToken)).status).toBe(200);

    // The server restarts without admin@snu.ac.kr on the list, while the access token is still valid.
    const restarted = await startApp({ ...settings, ADMINISTRATOR_EMAILS: 'second-admin@snu.ac.kr' }, [
      AdministrativeRouteController,
    ]);
    try {
      const response = await request(restarted.getHttpServer())
        .get('/administrative-route')
        .auth(accessToken, { type: 'bearer' });

      expect(response.status).toBe(403);
    } finally {
      await restarted.close();
    }
  });
});
