import { Controller, Get, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AdministratorOnly } from '../src/common/administrator-only.decorator.js';
import { Public } from '../src/common/public.decorator.js';
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

  @Get('public')
  @Public()
  @AdministratorOnly()
  readPublic(): string {
    return 'Nobody reads this.';
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

function getAdministrativeRoute(server: INestApplication<Server>, accessToken?: string): request.Test {
  const get = request(server.getHttpServer()).get('/administrative-route');
  return accessToken === undefined ? get : get.auth(accessToken, { type: 'bearer' });
}

describe('An administrative route', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    expect((await getAdministrativeRoute(app, accessToken)).status).toBe(200);
  });

  it('recognises an address on the list whatever its case', async () => {
    const { accessToken } = await signIn(app, { email: 'SECOND-ADMIN@snu.ac.kr' });

    expect((await getAdministrativeRoute(app, accessToken)).status).toBe(200);
  });

  it('refuses another signed-in User with 403 and says so', async () => {
    const { accessToken } = await signIn(app, { email: 'student@snu.ac.kr' });

    const response = await getAdministrativeRoute(app, accessToken);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Only an Administrator can use this route.' });
  });

  it('refuses a request without an access token with 401', async () => {
    expect((await getAdministrativeRoute(app)).status).toBe(401);
  });

  it('refuses an invalid access token with 401', async () => {
    expect((await getAdministrativeRoute(app, 'not-an-access-token')).status).toBe(401);
  });

  it('refuses every request with 401 when the route is marked @Public() as well', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    const response = await request(app.getHttpServer())
      .get('/administrative-route/public')
      .auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(401);
  });
});

describe('An Administrator taken off the list', () => {
  it('is refused, even with an access token issued before', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });
    expect((await getAdministrativeRoute(app, accessToken)).status).toBe(200);

    // The server restarts without admin@snu.ac.kr on the list, while the access token is still valid.
    const restarted = await startApp({ ...settings, ADMINISTRATOR_EMAILS: 'second-admin@snu.ac.kr' }, [
      AdministrativeRouteController,
    ]);
    try {
      expect((await getAdministrativeRoute(restarted, accessToken)).status).toBe(403);
    } finally {
      await restarted.close();
    }
  });
});
