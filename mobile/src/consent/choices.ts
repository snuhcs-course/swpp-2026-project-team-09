/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { apiClient } from '@/api/client';
import type { Consent } from '@/api/types';
import { readKept } from '@/storage/kept';
import { CONSENT_VERSION, consentAsked, keepConsent } from './kept-consent';

// The two ways the User changes the account's consent. Each is sent first and kept on the phone only once the account
// took it: a refusal or no answer is thrown and nothing is kept. Once it is taken, a phone that cannot keep the copy
// changes nothing for the User now: the next sign-in or Lobby writes the account's again.

// "동의하고 시작": the current version of the legal documents, with the choice on usage data. The earlier phone-only
// consent (`consented`) is set false with it: it has been carried over.
export async function agreeToDocuments(usage: boolean): Promise<void> {
  await apiClient.agreeToConsent(CONSENT_VERSION, usage);
  await keepConsent({ version: CONSENT_VERSION, usage }, { consented: false }).catch(() => null);
}

// "사용 기록 보내기" in 내 정보: the choice alone. The version stays, and nothing is asked again.
export async function chooseUsage(usage: boolean): Promise<void> {
  await apiClient.setUsageConsent(usage);
  await readKept()
    .then(({ consent }) => keepConsent({ ...consent, usage }))
    .catch(() => null);
}

// Whether the consent screen asks, at a sign-in or at a start with a kept Session, from the phone's copy of the
// account's consent and the earlier phone-only `consented`. A User who agreed on this phone before the account kept a
// consent (`consented: true`), and whose account holds none, is not asked again (the owner's decision of 2026-11-26):
// the app agrees for them, quietly, with usage data off, and they may turn it on in 내 정보. A failed send asks nothing
// either and is tried again at the next sign-in or start; until it goes through the copy holds no version, which reads
// as usage off.
export async function consentScreenAsks(consent: Consent, consented: boolean): Promise<boolean> {
  if (!consentAsked(consent)) {
    return false;
  }
  if (!consented || consent.version !== null) {
    return true;
  }
  await agreeToDocuments(false).catch(() => null);
  return false;
}
