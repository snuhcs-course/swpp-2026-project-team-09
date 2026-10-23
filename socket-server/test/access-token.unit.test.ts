/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The token check, with a real JwtService and keys made here: a valid token, then one property changed per refusal.
// Claims and audiences from main-server's README (Sign-in, Administrators); refusals from socket-server's README.

import { JwtService } from '@nestjs/jwt';
import { accessTokenOptions, verifyAccessToken } from '../src/users/access-token.js';
import { es256KeyPair } from './keys.js';

const HOUR = 60 * 60;
// The test's clock, in seconds, so that the expiry is the same on every run.
const NOW = Date.UTC(2026, 9, 22, 9, 0) / 1000;
const USER_ID = 'user-1';
const SESSION_ID = 'session-1';

const keys = es256KeyPair();
const jwt = new JwtService(accessTokenOptions(keys.publicKey));

interface Change {
  claims?: object;
  // In seconds; null signs no expiry.
  expiresIn?: number | null;
  key?: string;
  algorithm?: 'ES256' | 'HS256';
  audience?: string;
}

// An access token as the main server signs it: ES256 with the test's key, the User as `sub`, the Session as `sid`, the
// app's audience, valid for an hour. Each refusal changes one of these.
function accessToken({
  claims = { sub: USER_ID, sid: SESSION_ID },
  expiresIn = HOUR,
  key = keys.privateKey,
  algorithm = 'ES256',
  audience = 'snu-now-app',
}: Change = {}): string {
  const expiry = expiresIn === null ? {} : { expiresIn };
  return new JwtService().sign(claims, { privateKey: key, algorithm, audience, ...expiry });
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW * 1000, toFake: ['Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('The access token check', () => {
  it('a token as the main server signs it → its User, its Session and its expiry', async () => {
    expect(await verifyAccessToken(jwt, accessToken())).toEqual({ sub: USER_ID, sid: SESSION_ID, exp: NOW + HOUR });
  });

  // jsonwebtoken's documented messages name the check that refused each one.
  it.each<[string, Change, string]>([
    ['an expiry in the past', { expiresIn: -HOUR }, 'jwt expired'],
    ['the signature of another key', { key: es256KeyPair().privateKey }, 'invalid signature'],
    // HS256 is keyed with a secret: here the public key, which anyone may hold.
    ['HS256 keyed with the public key', { algorithm: 'HS256', key: keys.publicKey }, 'invalid algorithm'],
    ["the admin site's audience snu-now-admin", { audience: 'snu-now-admin' }, 'jwt audience invalid'],
  ])('the valid token but with %s → refused', async (_, change, check) => {
    await expect(verifyAccessToken(jwt, accessToken(change))).rejects.toThrow(check);
  });

  it.each<[string, Change]>([
    ['no Session (`sid`)', { claims: { sub: USER_ID } }],
    ['no User (`sub`)', { claims: { sid: SESSION_ID } }],
    ['no expiry', { expiresIn: null }],
  ])('the valid token but with %s → refused', async (_, change) => {
    await expect(verifyAccessToken(jwt, accessToken(change))).rejects.toThrow();
  });

  it.each([
    ['no value', undefined],
    ['null', null],
    ['a number', 42],
    ['an object', {}],
  ])('%s instead of a token → refused', async (_, value) => {
    await expect(verifyAccessToken(jwt, value)).rejects.toThrow();
  });
});
