/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { CONSENT_VERSION } from '../consent.js';

// The consent screen's agreement: the version of the documents shown and the usage choice. A version above the
// server's CONSENT_VERSION is one the server has not published, so it is refused with 400.
export const consentSchema = z.strictObject({
  version: z.number().int().min(1).max(CONSENT_VERSION),
  usage: z.boolean(),
});

export type ConsentBodyDto = z.infer<typeof consentSchema>;

// The switch in 내 정보: the usage choice alone, which never sends a version.
export const usageConsentSchema = z.strictObject({ usage: z.boolean() });

export type UsageConsentDto = z.infer<typeof usageConsentSchema>;

// The account's consent in the sign-in's answer and the Lobby, as stored: null for an account that agreed to none.
export interface ConsentDto {
  version: number | null;
  usage: boolean | null;
}
