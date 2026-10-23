/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { JwtModuleOptions, JwtService } from '@nestjs/jwt';

// The same as the main server's USER_TOKEN_AUDIENCE, so that an Administrator's token is refused.
const USER_TOKEN_AUDIENCE = 'snu-now-app';

// What an access token says: the User's identifier as the subject, the session as `sid`, and its expiry as `exp` in
// seconds. The main server signs it.
export interface AccessTokenPayload {
  sub: string;
  sid: string;
  exp: number;
}

// The main server signs access tokens with its private key. The socket server verifies them with the public key alone,
// without asking the main server.
export function accessTokenOptions(publicKey: string): JwtModuleOptions {
  return { publicKey, verifyOptions: { algorithms: ['ES256'], audience: USER_TOKEN_AUDIENCE } };
}

// A missing, expired or altered token, one signed with another key, an Administrator's token, or one without a session
// rejects. `jwt` holds accessTokenOptions.
export async function verifyAccessToken(jwt: JwtService, token: unknown): Promise<AccessTokenPayload> {
  if (typeof token !== 'string') {
    throw new TypeError('No access token');
  }
  const payload = await jwt.verifyAsync<Partial<AccessTokenPayload>>(token);
  if (payload.sub === undefined || payload.sid === undefined || payload.exp === undefined) {
    throw new TypeError('No session');
  }
  return { sub: payload.sub, sid: payload.sid, exp: payload.exp };
}
