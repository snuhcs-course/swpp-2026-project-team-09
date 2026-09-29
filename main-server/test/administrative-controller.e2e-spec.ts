import { Controller, Get, INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { AdministratorOnly } from '../src/common/administrator-only.decorator.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

// Marking a whole controller, as P12's administrative routes can be. test/administrators.e2e-spec.ts marks one route.
@AdministratorOnly()
@Controller('administrative')
class AdministrativeController {
  @Get()
  read(): string {
    return 'Only an Administrator reads this.';
  }
}

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp({ ...settings, ADMINISTRATOR_EMAILS: 'admin@snu.ac.kr' }, [AdministrativeController]);
});

afterAll(async () => {
  await app.close();
});

describe('A controller marked administrative', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signIn(app, { email: 'admin@snu.ac.kr' });

    const response = await request(app.getHttpServer()).get('/administrative').auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(200);
  });

  it('refuses another signed-in User with 403', async () => {
    const { accessToken } = await signIn(app, { email: 'student@snu.ac.kr' });

    const response = await request(app.getHttpServer()).get('/administrative').auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(403);
  });
});
