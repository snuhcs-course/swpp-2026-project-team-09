/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { TokenPayload } from 'google-auth-library';
import { UAT_ACCOUNT_LIST } from '../uat/uat-accounts.js';

type SignInClaims = Pick<TokenPayload, 'sub' | 'hd' | 'email' | 'email_verified' | 'name'>;

// The stand-in in front of the Google check while HE_ACCOUNTS is on: an ID token equal to a UAT account's key gets the
// claims Google would give an SNU account. Any other token is left to Google.
export function uatAccountClaims(idToken: string): SignInClaims | undefined {
  const account = UAT_ACCOUNT_LIST.find(({ key }) => key === idToken);
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
