/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { lobbyConsentOf, putConsent, putUsageConsent, storedConsentOf } from './consent.js';
import { connect } from './containers.js';
import { googleSubject } from './google.js';
import { signIn } from './sign-in.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let prisma: PrismaClient;

beforeAll(async () => {
  app = await startApp(settings);
  prisma = connect(settings.DATABASE_URL);
});

afterAll(async () => {
  await prisma.$disconnect();
  await app.close();
});

async function agreed(usage: boolean): Promise<{ sub: string; accessToken: string }> {
  const sub = googleSubject();
  const { accessToken } = await signIn(app, { sub });
  await putConsent(app, accessToken, { version: 1, usage }).expect(204);
  return { sub, accessToken };
}

describe('PUT /users/me/usage-consent', () => {
  it('turns the choice off and on again, leaving the version and when it was agreed to', async () => {
    const { sub, accessToken } = await agreed(true);
    const before = await storedConsentOf(prisma, sub);

    expect((await putUsageConsent(app, accessToken, { usage: false })).status).toBe(204);
    const off = await storedConsentOf(prisma, sub);
    expect(off).toMatchObject({ consentVersion: 1, usageConsent: false, consentedAt: before.consentedAt });
    expect(off.usageChosenAt?.getTime()).toBeGreaterThanOrEqual(before.usageChosenAt?.getTime() ?? Infinity);
    expect(await lobbyConsentOf(app, accessToken)).toEqual({ version: 1, usage: false });

    expect((await putUsageConsent(app, accessToken, { usage: true })).status).toBe(204);
    expect(await storedConsentOf(prisma, sub)).toMatchObject({
      consentVersion: 1,
      usageConsent: true,
      consentedAt: before.consentedAt,
    });
    expect(await lobbyConsentOf(app, accessToken)).toEqual({ version: 1, usage: true });
  });

  it('answers the same choice again 204', async () => {
    const { sub, accessToken } = await agreed(false);

    expect((await putUsageConsent(app, accessToken, { usage: false })).status).toBe(204);
    expect(await storedConsentOf(prisma, sub)).toMatchObject({ consentVersion: 1, usageConsent: false });
  });
});

describe('PUT /users/me/usage-consent refused', () => {
  it('refuses an account that has agreed to no version with 409 and stores nothing', async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });

    const response = await putUsageConsent(app, accessToken, { usage: true });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONSENT_REQUIRED' });
    expect(await storedConsentOf(prisma, sub)).toEqual({
      consentVersion: null,
      usageConsent: null,
      consentedAt: null,
      usageChosenAt: null,
    });
  });

  it.each([
    ['a version, which this route never takes', { usage: true, version: 1 }],
    ['a usage that is not a boolean', { usage: 1 }],
    ['no body', {}],
  ])('refuses %s with 400', async (_case, body) => {
    const { accessToken } = await agreed(true);

    expect((await putUsageConsent(app, accessToken, body)).status).toBe(400);
  });

  it('refuses a request without an access token with 401', async () => {
    expect((await putUsageConsent(app, undefined, { usage: true })).status).toBe(401);
  });
});
