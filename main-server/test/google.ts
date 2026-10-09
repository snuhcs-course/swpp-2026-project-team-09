// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #5 #10 #14
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { randomInt } from 'node:crypto';
import { inject } from 'vitest';
import { GoogleIdTokenVerifier } from '../src/auth/google-id-token.verifier.js';
import { rsaKeyPair } from './keys.js';

// Google in the tests: ID tokens are signed with a test key instead of one of Google's keys.

const KEY_ID = 'test-google-key';

const googleKeys = rsaKeyPair();

// Checks a token as the real verifier does, with Google's library, but against the test key.
export class TestGoogleIdTokenVerifier implements GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  async verify(idToken: string, audiences: readonly string[]): Promise<TokenPayload | undefined> {
    try {
      const ticket = await this.client.verifySignedJwtWithCertsAsync(
        idToken,
        { [KEY_ID]: googleKeys.publicKey },
        [...audiences],
        this.client.issuers,
      );
      return ticket.getPayload();
    } catch {
      return undefined;
    }
  }
}

// Google's subject identifiers are strings of up to 21 digits.
export function googleSubject(): string {
  return String(randomInt(2 ** 47));
}

// A Google ID token for a new SNU account, issued to the app. Pass claims to change them.
export function googleIdToken(claims: Partial<TokenPayload> = {}, privateKey = googleKeys.privateKey): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    iss: 'https://accounts.google.com',
    aud: inject('settings').GOOGLE_APP_CLIENT_ID,
    sub: googleSubject(),
    email: 'student@snu.ac.kr',
    email_verified: true,
    hd: 'snu.ac.kr',
    iat: now,
    exp: now + 3600,
    ...claims,
  };
  return new JwtService().sign(payload, { privateKey, algorithm: 'RS256', keyid: KEY_ID });
}

// The initial Administrator of the test settings. The first sign-in of the run binds this Google account to them, so
// every test signs in as them with it.
export const ADMINISTRATOR = { email: 'admin@example.com', sub: '200000000000000000001' };

// For the initial Administrator unless claims change it. No hosted domain: an Administrator's account may be outside
// SNU.
export function administratorIdToken(claims: Partial<TokenPayload> = {}): string {
  return googleIdToken({ aud: inject('settings').GOOGLE_ADMIN_CLIENT_ID, hd: undefined, ...ADMINISTRATOR, ...claims });
}
