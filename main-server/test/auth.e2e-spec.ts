import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { googleIdToken } from './google.js';
import { es256KeyPair, rsaKeyPair } from './keys.js';
import { getMe, postSignIn, refreshTokenHash, signIn, tokensSchema } from './sign-in.js';
import { startApp } from './start-app.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const HOUR = 60 * 60;
const DAY = 24 * HOUR;

interface AccessTokenPayload {
  sub: string;
  sid: string;
  aud: string;
  iat: number;
  exp: number;
}

const settings = inject('settings');
let app: INestApplication<Server>;
// The tests read the stored result with their own connection, under the server's settings.
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: settings.DATABASE_URL }) });
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

function postIdToken(idToken: string): request.Test {
  return request(app.getHttpServer()).post('/auth/google').send({ idToken });
}

// Checks the access token with the public key alone, as the other servers will.
function verifyAccessToken(accessToken: string): AccessTokenPayload {
  return new JwtService().verify<AccessTokenPayload>(accessToken, {
    publicKey: settings.ACCESS_TOKEN_PUBLIC_KEY,
    algorithms: ['ES256'],
  });
}

describe('Sign-in with an SNU Google account', () => {
  it('answers with an access token and a refresh token and creates the User', async () => {
    const response = await postSignIn(app, { sub: '100000000000000000001', email: 'first@snu.ac.kr' });

    expect(response.status).toBe(200);
    tokensSchema.parse(response.body);
    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: '100000000000000000001' } });
    expect(user.id).toMatch(UUID_V4);
    expect(user.email).toBe('first@snu.ac.kr');
  });

  it('returns the same User when the same Google account signs in again', async () => {
    const first = await signIn(app, { sub: '100000000000000000002' });
    const second = await signIn(app, { sub: '100000000000000000002' });

    const users = await prisma.user.findMany({ where: { googleSubject: '100000000000000000002' } });
    expect(users).toHaveLength(1);
    expect(verifyAccessToken(first.accessToken).sub).toBe(users[0]?.id);
    expect(verifyAccessToken(second.accessToken).sub).toBe(users[0]?.id);
  });

  it("issues an access token for the User's session, signed with the private key and valid for 1 hour", async () => {
    const { accessToken } = await signIn(app, { sub: '100000000000000000003' });

    const payload = verifyAccessToken(accessToken);
    const user = await prisma.user.findUniqueOrThrow({ where: { googleSubject: '100000000000000000003' } });
    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(payload).toEqual({
      sub: user.id,
      sid: session.id,
      aud: 'snu-now-app',
      iat: payload.iat,
      exp: payload.iat + HOUR,
    });
  });

  it('stores the refresh token hashed and valid for 30 days', async () => {
    const signedInAt = Date.now();
    const { refreshToken } = await signIn(app, { sub: '100000000000000000004' });

    const stored = await prisma.refreshToken.findMany({
      where: { session: { user: { googleSubject: '100000000000000000004' } } },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toBe(refreshTokenHash(refreshToken));
    const lifetime = (stored[0]?.expiresAt.getTime() ?? 0) - signedInAt;
    expect(lifetime).toBeGreaterThanOrEqual(30 * DAY * 1000);
    expect(lifetime).toBeLessThan(30 * DAY * 1000 + 60_000);
  });
});

describe('Sign-in refused for the account', () => {
  it('refuses an account outside SNU and says so', async () => {
    const response = await postIdToken(googleIdToken({ email: 'student@korea.ac.kr', hd: 'korea.ac.kr' }));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Sign in with an SNU Google account (snu.ac.kr).' });
  });

  it('refuses an @snu.ac.kr email address without the hosted domain claim', async () => {
    const response = await postIdToken(googleIdToken({ email: 'student@snu.ac.kr', hd: undefined }));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: 'Sign in with an SNU Google account (snu.ac.kr).' });
  });

  it('refuses an unverified email address and says so', async () => {
    const response = await postIdToken(googleIdToken({ email_verified: false }));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ message: "The Google account's email address is not verified." });
  });

  it('creates no User when it refuses', async () => {
    await postIdToken(googleIdToken({ sub: '100000000000000000005', hd: undefined }));

    expect(await prisma.user.count({ where: { googleSubject: '100000000000000000005' } })).toBe(0);
  });
});

describe('Sign-in refused for the ID token', () => {
  const invalid = { message: 'The Google ID token is invalid or expired.' };

  it('refuses an ID token issued to another client', async () => {
    const response = await postIdToken(googleIdToken({ aud: 'another-app.apps.googleusercontent.com' }));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(invalid);
  });

  it("refuses an ID token issued to the admin site's client", async () => {
    const response = await postIdToken(googleIdToken({ aud: settings.GOOGLE_ADMIN_CLIENT_ID }));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(invalid);
  });

  it('refuses an expired ID token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const response = await postIdToken(googleIdToken({ iat: now - 2 * HOUR, exp: now - HOUR }));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(invalid);
  });

  it('refuses an ID token that Google did not sign', async () => {
    const response = await postIdToken(googleIdToken({}, rsaKeyPair().privateKey));

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject(invalid);
  });

  it('refuses a request without an ID token and names the field', async () => {
    const response = await request(app.getHttpServer()).post('/auth/google').send({});

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('idToken');
  });
});

describe('A protected route', () => {
  it('recognises the User from the access token', async () => {
    const { accessToken } = await signIn(app, { email: 'me@snu.ac.kr' });

    const response = await getMe(app, accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: verifyAccessToken(accessToken).sub, email: 'me@snu.ac.kr' });
  });

  it('refuses a request without an access token', async () => {
    const response = await getMe(app);

    expect(response.status).toBe(401);
  });

  it('refuses an expired access token', async () => {
    const { sub } = verifyAccessToken((await signIn(app)).accessToken);
    const now = Math.floor(Date.now() / 1000);
    const expired = new JwtService().sign(
      { sub, aud: 'snu-now-app', iat: now - 2 * HOUR, exp: now - HOUR },
      { privateKey: settings.ACCESS_TOKEN_PRIVATE_KEY, algorithm: 'ES256' },
    );

    expect((await getMe(app, expired)).status).toBe(401);
  });

  it('refuses an altered access token', async () => {
    const [header, , signature] = (await signIn(app)).accessToken.split('.');
    // Another User's claims under the first token's signature.
    const [, otherPayload] = (await signIn(app)).accessToken.split('.');

    expect((await getMe(app, `${header}.${otherPayload}.${signature}`)).status).toBe(401);
  });

  it('refuses an access token signed with another key', async () => {
    const { sub } = verifyAccessToken((await signIn(app)).accessToken);
    const forged = new JwtService().sign(
      { sub, aud: 'snu-now-app' },
      { privateKey: es256KeyPair().privateKey, algorithm: 'ES256' },
    );

    expect((await getMe(app, forged)).status).toBe(401);
  });
});
