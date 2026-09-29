/* oxlint-disable max-classes-per-file -- One test controller marks a route, the other a whole controller. */
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AdministratorOnly } from '../src/common/administrator-only.decorator.js';
import { Public } from '../src/common/public.decorator.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

// No feature has an administrative route yet (P12 adds them), so these tests mark routes of their own.
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

@AdministratorOnly()
@Controller('administrative-controller')
class AdministrativeController {
  @Get()
  read(): string {
    return 'Only an Administrator reads this.';
  }
}

const controllers = [AdministrativeRouteController, AdministrativeController];
const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings, controllers);
});

afterAll(async () => {
  await app.close();
});

function get(path: string, accessToken?: string, target = app): request.Test {
  const call = request(target.getHttpServer()).get(path);
  return accessToken === undefined ? call : call.auth(accessToken, { type: 'bearer' });
}

async function withAdministrators(
  list: string,
  run: (target: INestApplication<Server>) => Promise<void>,
): Promise<void> {
  const target = await startApp({ ...settings, ADMINISTRATOR_EMAILS: list }, controllers);
  try {
    await run(target);
  } finally {
    await target.close();
  }
}

describe('An administrative route', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

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

  it('refuses an invalid access token with 401', async () => {
    expect((await get('/administrative-route', 'not-an-access-token')).status).toBe(401);
  });

  it('refuses every request with 401 when the route is marked @Public() as well', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    expect((await get('/administrative-route/public', accessToken)).status).toBe(401);
  });
});

describe('A controller marked administrative', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    expect((await get('/administrative-controller', accessToken)).status).toBe(200);
  });

  it('refuses another signed-in User with 403', async () => {
    const { accessToken } = await signIn(app, { email: 'student@snu.ac.kr' });

    expect((await get('/administrative-controller', accessToken)).status).toBe(403);
  });
});

describe('The Administrator list', () => {
  it('matches an address whatever its case on either side', async () => {
    const { accessToken } = await signIn(app, { email: 'SECOND-ADMIN@snu.ac.kr' });

    await withAdministrators('admin@snu.ac.kr, Second-Admin@SNU.ac.kr', async (target) => {
      expect((await get('/administrative-route', accessToken, target)).status).toBe(200);
    });
  });

  it('refuses an Administrator taken off it, even with an access token issued before', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });
    expect((await get('/administrative-route', accessToken)).status).toBe(200);

    // The server restarts without admin@snu.ac.kr on the list, while the access token is still valid.
    await withAdministrators('second-admin@snu.ac.kr', async (target) => {
      expect((await get('/administrative-route', accessToken, target)).status).toBe(403);
    });
  });
});
