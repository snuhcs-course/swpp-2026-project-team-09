/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Controller, Get, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { z } from 'zod';
import { AdministratorOnly } from '../src/common/administrator-only.decorator.js';
import { Public } from '../src/common/public.decorator.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ADMINISTRATOR, administratorIdToken, googleSubject } from './google.js';
import {
  administratorTokensSchema,
  registerAdministrator,
  signIn,
  signInAsAdministrator,
  signInAsNewAdministrator,
} from './sign-in.js';
import { startApp } from './start-app.js';

const HOUR = 60 * 60;

interface AccessTokenPayload {
  sub: string;
  aud: string;
  iat: number;
  exp: number;
}

@AdministratorOnly()
@Controller('administrative-controller')
class AdministrativeController {
  @Get()
  read(): string {
    return 'Only an Administrator reads this.';
  }

  @Get('public')
  @Public()
  readPublic(): string {
    return 'Anyone reads this.';
  }
}

const settings = inject('settings');
let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings, [AdministrativeController]);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function postIdToken(idToken: string): request.Test {
  return request(app.getHttpServer()).post('/admin/auth/google').send({ idToken });
}

function get(path: string, accessToken?: string): request.Test {
  const call = request(app.getHttpServer()).get(path);
  return accessToken === undefined ? call : call.auth(accessToken, { type: 'bearer' });
}

function verifyAccessToken(accessToken: string): AccessTokenPayload {
  return new JwtService().verify<AccessTokenPayload>(accessToken, {
    publicKey: settings.ACCESS_TOKEN_PUBLIC_KEY,
    algorithms: ['ES256'],
  });
}

describe('Sign-in to the admin site', () => {
  it('answers a registered Administrator with an access token and no refresh token', async () => {
    const response = await postIdToken(administratorIdToken());

    expect(response.status).toBe(200);
    administratorTokensSchema.parse(response.body);
  });

  it("issues an access token for the Administrator's id, of its own audience, valid for 8 hours", async () => {
    const { accessToken } = await signInAsAdministrator(app);

    const payload = verifyAccessToken(accessToken);
    const administrator = await prisma.administrator.findUniqueOrThrow({ where: { email: ADMINISTRATOR.email } });
    expect(payload).toEqual({
      sub: administrator.id,
      aud: 'snu-now-admin',
      iat: payload.iat,
      exp: payload.iat + 8 * HOUR,
    });
  });
});

describe("An Administrator's Google account", () => {
  it('recognises the Google account after the first sign-in, whatever its email address has become', async () => {
    const first = verifyAccessToken((await signInAsAdministrator(app)).accessToken);

    const renamed = verifyAccessToken((await signInAsAdministrator(app, { email: 'renamed@example.com' })).accessToken);

    expect(renamed.sub).toBe(first.sub);
  });

  it('refuses another Google account with the registered email address', async () => {
    await signInAsAdministrator(app);

    const response = await postIdToken(administratorIdToken({ sub: '200000000000000000003' }));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Only a registered Administrator can sign in.' });
  });
});

describe("Sign-in to the admin site and the app's Users", () => {
  it('creates no User', async () => {
    await signInAsAdministrator(app);

    expect(await prisma.user.count({ where: { googleSubject: ADMINISTRATOR.sub } })).toBe(0);
  });

  it("leaves the same person's User untouched", async () => {
    const person = { sub: googleSubject(), email: `${randomUUID()}@snu.ac.kr` };
    const { accessToken: userToken } = await signIn(app, person);
    const user = z.object({ id: z.string(), email: z.string() }).parse((await get('/users/me', userToken)).body);
    const { accessToken: registrarToken } = await signInAsAdministrator(app);
    await registerAdministrator(app, registrarToken, person.email);

    const { accessToken: administratorToken } = await signInAsAdministrator(app, person);

    expect(verifyAccessToken(administratorToken).sub).not.toBe(user.id);
    expect((await get('/users/me', userToken)).body).toEqual(user);
    expect(await prisma.user.count({ where: { googleSubject: person.sub } })).toBe(1);
  });
});

describe('Sign-in to the admin site refused', () => {
  it('refuses an email address that is not registered and says so', async () => {
    const response = await postIdToken(
      administratorIdToken({ sub: '200000000000000000002', email: 'nobody@example.com' }),
    );

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Only a registered Administrator can sign in.' });
  });

  it('refuses an unverified email address and says so', async () => {
    const response = await postIdToken(administratorIdToken({ email_verified: false }));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: "The Google account's email address is not verified." });
  });

  it("refuses an ID token issued to the app's client", async () => {
    const response = await postIdToken(administratorIdToken({ aud: settings.GOOGLE_APP_CLIENT_ID }));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'The Google ID token is invalid or expired.' });
  });
});

// GET /admin/administrators stands for every administrative route.
describe('An administrative route', () => {
  it('lets an Administrator through', async () => {
    const { accessToken } = await signInAsAdministrator(app);

    expect((await get('/admin/administrators', accessToken)).status).toBe(200);
  });

  it('refuses a request without an access token', async () => {
    expect((await get('/admin/administrators')).status).toBe(401);
  });

  it("refuses a User's access token", async () => {
    const { accessToken } = await signIn(app);

    expect((await get('/admin/administrators', accessToken)).status).toBe(401);
  });

  it("refuses a token with a User's audience even when it names an Administrator", async () => {
    const { sub } = verifyAccessToken((await signInAsAdministrator(app)).accessToken);
    // Signed as the main server signs a User's access token, so that only the audience tells it apart.
    const userAudience = new JwtService().sign(
      { sub, aud: 'snu-now-app' },
      { privateKey: settings.ACCESS_TOKEN_PRIVATE_KEY, algorithm: 'ES256', expiresIn: '1h' },
    );

    expect((await get('/admin/administrators', userAudience)).status).toBe(401);
  });

  it('refuses a Google ID token', async () => {
    expect((await get('/admin/administrators', administratorIdToken())).status).toBe(401);
  });

  it("refuses an Administrator's access token past 8 hours", async () => {
    const { sub } = verifyAccessToken((await signInAsAdministrator(app)).accessToken);
    const now = Math.floor(Date.now() / 1000);
    const expired = new JwtService().sign(
      { sub, aud: 'snu-now-admin', iat: now - 8 * HOUR - 1, exp: now - 1 },
      { privateKey: settings.ACCESS_TOKEN_PRIVATE_KEY, algorithm: 'ES256' },
    );

    expect((await get('/admin/administrators', expired)).status).toBe(401);
  });
});

// `iat` has whole seconds, so a token issued in the second of a sign-out is refused as well.
async function nextSecond(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 1000 - (Date.now() % 1000));
  });
}

describe('Signing out of the admin site', () => {
  it('ends every access token issued to the Administrator so far, and a new sign-in works', async () => {
    const { email, sub, accessToken } = await signInAsNewAdministrator(app);
    const otherBrowser = await signInAsAdministrator(app, { sub, email });

    const response = await request(app.getHttpServer())
      .post('/admin/auth/sign-out')
      .auth(accessToken, { type: 'bearer' });

    expect(response.status).toBe(204);
    expect((await get('/admin/administrators', accessToken)).status).toBe(401);
    expect((await get('/admin/administrators', otherBrowser.accessToken)).status).toBe(401);
    await nextSecond();
    const again = await signInAsAdministrator(app, { sub, email });
    expect((await get('/admin/administrators', again.accessToken)).status).toBe(200);
  });
});

describe('The signed-in Administrator', () => {
  it('reads their own id and email address', async () => {
    const { id, email, accessToken } = await signInAsNewAdministrator(app);

    const response = await get('/admin/auth/me', accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id, email });
  });

  it("is refused with a User's access token", async () => {
    const { accessToken } = await signIn(app);

    expect((await get('/admin/auth/me', accessToken)).status).toBe(401);
  });
});

// GET /users/me stands for every route of a User.
describe("A User's route", () => {
  it("refuses an Administrator's access token", async () => {
    const { accessToken } = await signInAsAdministrator(app);

    expect((await get('/users/me', accessToken)).status).toBe(401);
  });
});

describe('A controller marked administrative', () => {
  it("lets an Administrator through and refuses a User's access token", async () => {
    const { accessToken: administratorToken } = await signInAsAdministrator(app);
    const { accessToken: userToken } = await signIn(app);

    expect((await get('/administrative-controller', administratorToken)).status).toBe(200);
    expect((await get('/administrative-controller', userToken)).status).toBe(401);
  });

  it('opens a route of it marked @Public()', async () => {
    expect((await get('/administrative-controller/public')).status).toBe(200);
  });
});
