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

// The accepted audiences from the settings: the app's client first, then the admin site's.
export function googleClientIds(): string[] {
  return inject('settings').GOOGLE_CLIENT_IDS.split(',');
}

// A Google ID token for a new SNU account, issued to the app. Pass claims to change them.
export function googleIdToken(
  claims: Readonly<Partial<TokenPayload>> = {},
  privateKey = googleKeys.privateKey,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    iss: 'https://accounts.google.com',
    aud: googleClientIds()[0] ?? '',
    // Google's subject identifiers are strings of up to 21 digits.
    sub: String(randomInt(2 ** 47)),
    email: 'student@snu.ac.kr',
    email_verified: true,
    hd: 'snu.ac.kr',
    iat: now,
    exp: now + 3600,
    ...claims,
  };
  return new JwtService().sign(payload, { privateKey, algorithm: 'RS256', keyid: KEY_ID });
}
