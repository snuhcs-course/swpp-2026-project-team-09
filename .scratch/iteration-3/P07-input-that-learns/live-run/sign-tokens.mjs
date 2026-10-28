/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-29  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { createPrivateKey, sign } from 'node:crypto';

// Access tokens for the five accounts of seed-accounts.sql, signed as the main server signs them (ES256, audience
// snu-now-app, one hour), with the private key of main-server/.env:
//   node --env-file=main-server/.env .scratch/iteration-3/P07-input-that-learns/live-run/sign-tokens.mjs
// Prints one `TOKEN_<letter>=<token>` line per account, to source into a shell. No dependency, so it runs anywhere.

const ACCOUNTS = {
  A: ['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-aaaaaaaaaaaa'],
  B: ['22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-aaaaaaaaaaaa'],
  C: ['33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-aaaaaaaaaaaa'],
  D: ['44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-aaaaaaaaaaaa'],
  E: ['55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-aaaaaaaaaaaa'],
};

const pem = process.env.ACCESS_TOKEN_PRIVATE_KEY;
if (pem === undefined) {
  throw new Error('ACCESS_TOKEN_PRIVATE_KEY is not set: pass --env-file=main-server/.env');
}
const key = createPrivateKey(pem);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);

for (const [letter, [sub, sid]] of Object.entries(ACCOUNTS)) {
  const header = encode({ alg: 'ES256', typ: 'JWT' });
  const payload = encode({ sub, sid, aud: 'snu-now-app', iat: now, exp: now + 60 * 60 });
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' });
  console.log(`TOKEN_${letter}=${header}.${payload}.${signature.toString('base64url')}`);
}
