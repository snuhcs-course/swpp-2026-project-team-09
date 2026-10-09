/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ConsentScreen } from '@/screens/consent-screen';
import { useOwnPlace } from '@/session/session';

// The consent screen's place: after the first sign-in on this phone, before Onboarding.
export default function ConsentRoute(): ReactElement {
  return useOwnPlace('consent') ?? <ConsentScreen />;
}
