/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { forgetUser as forgetSentryUser, identifyUser as identifySentryUser } from './sentry';
import { forgetUsageUser, identifyUsageUser } from './usage';

// The signed-in User for both the crash reports and usage data: the User's id and nothing else. At a sign-in, and at
// a start with a kept Session.
export function identifyUser(id: string): void {
  if (id === '') {
    forgetUser();
    return;
  }
  identifySentryUser(id);
  identifyUsageUser(id);
}

// At a sign-out, and when the Session ends from the main server's side.
export function forgetUser(): void {
  forgetSentryUser();
  forgetUsageUser();
}
