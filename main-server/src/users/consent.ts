/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The version of the legal documents the app shows on its consent screen. Raise it together with the app's
// CONSENT_VERSION (mobile), in the same pull request, whenever the documents change.
export const CONSENT_VERSION = 1;

// The account's consent as it is stored: the version agreed to and the usage choice given with it, null for none.
export interface StoredConsent {
  consentVersion: number | null;
  usageConsent: boolean | null;
}

// The only rule for whether usage data about a User may be sent: the account has agreed to the current version, or a
// later one, and chose usage data.
export function usageMayBeSent({ consentVersion, usageConsent }: StoredConsent): boolean {
  return consentVersion !== null && consentVersion >= CONSENT_VERSION && usageConsent === true;
}
