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
import { signIn, signInBeforeOnboarding } from './sign-in.js';
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

async function signedIn(): Promise<{ sub: string; accessToken: string }> {
  const sub = googleSubject();
  return { sub, accessToken: (await signIn(app, { sub })).accessToken };
}

describe('PUT /users/me/consent', () => {
  it('stores a first consent with its choice and the time, and the Lobby carries it', async () => {
    const { sub, accessToken } = await signedIn();

    expect((await putConsent(app, accessToken, { version: 1, usage: true })).status).toBe(204);

    const stored = await storedConsentOf(prisma, sub);
    expect(stored).toMatchObject({ consentVersion: 1, usageConsent: true });
    expect(stored.consentedAt).toBeInstanceOf(Date);
    expect(stored.usageChosenAt).toEqual(stored.consentedAt);
    expect(await lobbyConsentOf(app, accessToken)).toEqual({ version: 1, usage: true });
  });

  it('answers a repeat of the same version 204 and stores its choice, keeping when the version was agreed to', async () => {
    const { sub, accessToken } = await signedIn();
    await putConsent(app, accessToken, { version: 1, usage: true }).expect(204);
    const first = await storedConsentOf(prisma, sub);

    expect((await putConsent(app, accessToken, { version: 1, usage: false })).status).toBe(204);

    const repeated = await storedConsentOf(prisma, sub);
    expect(repeated).toMatchObject({ consentVersion: 1, usageConsent: false, consentedAt: first.consentedAt });
    expect(repeated.usageChosenAt?.getTime()).toBeGreaterThanOrEqual(first.usageChosenAt?.getTime() ?? Infinity);
  });

  it("refuses a version lower than the account's with 409 and changes nothing", async () => {
    const { sub, accessToken } = await signedIn();
    // A later version of the documents, which this server does not publish yet.
    await prisma.user.update({ where: { googleSubject: sub }, data: { consentVersion: 2, usageConsent: true } });

    const response = await putConsent(app, accessToken, { version: 1, usage: false });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONSENT_VERSION_OUTDATED' });
    expect(await storedConsentOf(prisma, sub)).toMatchObject({ consentVersion: 2, usageConsent: true });
  });
});

describe('PUT /users/me/consent with a wrong request', () => {
  it.each([
    ['a version above CONSENT_VERSION', { version: 2, usage: true }],
    ['version 0', { version: 0, usage: true }],
    ['a version that is not whole', { version: 1.5, usage: true }],
    ['a version as text', { version: '1', usage: true }],
    ['no usage', { version: 1 }],
    ['a usage that is not a boolean', { version: 1, usage: 'yes' }],
    ['a field it does not know', { version: 1, usage: true, at: '2026-11-26' }],
    ['no body', {}],
  ])('refuses %s with 400 and stores nothing', async (_case, body) => {
    const { sub, accessToken } = await signedIn();

    expect((await putConsent(app, accessToken, body)).status).toBe(400);
    expect(await storedConsentOf(prisma, sub)).toMatchObject({ consentVersion: null, usageConsent: null });
  });

  it('refuses a request without an access token with 401', async () => {
    expect((await putConsent(app, undefined, { version: 1, usage: true })).status).toBe(401);
  });
});

describe('The consent before onboarding', () => {
  it('lets a User who has not finished onboarding agree and change the choice', async () => {
    const sub = googleSubject();
    const { accessToken } = await signInBeforeOnboarding(app, { sub });

    expect((await putConsent(app, accessToken, { version: 1, usage: false })).status).toBe(204);
    expect((await putUsageConsent(app, accessToken, { usage: true })).status).toBe(204);
    expect(await storedConsentOf(prisma, sub)).toMatchObject({ consentVersion: 1, usageConsent: true });
  });
});

describe("The consent in the sign-in's answer", () => {
  it('is null for an account that agreed to none', async () => {
    expect((await signInBeforeOnboarding(app)).consent).toEqual({ version: null, usage: null });
  });

  it("is the account's on the next sign-in, as on a new phone", async () => {
    const sub = googleSubject();
    const { accessToken } = await signIn(app, { sub });
    await putConsent(app, accessToken, { version: 1, usage: true }).expect(204);

    expect((await signInBeforeOnboarding(app, { sub })).consent).toEqual({ version: 1, usage: true });
  });
});
