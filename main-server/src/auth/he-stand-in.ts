/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { TokenPayload } from 'google-auth-library';
import { HE_ACCOUNTS } from '../he/he-accounts.js';

// The claims of a Google ID token that the sign-in reads.
export type SignInClaims = Pick<TokenPayload, 'sub' | 'hd' | 'email' | 'email_verified' | 'name'>;

// The HE stand-in (P15), in front of the Google check while HE_ACCOUNTS is on: an ID token equal to an HE account's
// key gets the claims Google would give an SNU account. Any other token is left to Google.
export function heAccountClaims(idToken: string): SignInClaims | undefined {
  const account = HE_ACCOUNTS.find(({ key }) => key === idToken);
  if (account === undefined) {
    return undefined;
  }
  return {
    sub: account.key,
    hd: 'snu.ac.kr',
    email: account.email,
    email_verified: true,
    name: account.googleName,
  };
}
