/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Partitions of the account's consent: no version, a lower one, the current one, a later one; usage true, false or
// null.

import { CONSENT_VERSION, usageMayBeSent } from '../src/users/consent.js';

describe('Whether usage data may be sent', () => {
  it.each([
    ['the current version with usage chosen', CONSENT_VERSION, true],
    ['a later version with usage chosen', CONSENT_VERSION + 1, true],
  ])('is true for %s', (_case, consentVersion, usageConsent) => {
    expect(usageMayBeSent({ consentVersion, usageConsent })).toBe(true);
  });

  it.each([
    ['no version', null, null],
    ['no version, with a usage choice left over', null, true],
    ['a lower version with usage chosen', CONSENT_VERSION - 1, true],
    ['the current version with usage refused', CONSENT_VERSION, false],
    ['the current version with no usage choice', CONSENT_VERSION, null],
  ])('is false for %s', (_case, consentVersion, usageConsent) => {
    expect(usageMayBeSent({ consentVersion, usageConsent })).toBe(false);
  });
});
