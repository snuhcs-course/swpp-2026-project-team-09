/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { updateProfileSchema } from './update-profile.dto.js';

// The profile that the app's onboarding sends. The name and the department are needed only where the SNU account
// gives none, which the service checks. The 학번, the registered name and the 소속 are the edit's only: sent here, they
// are left out.
export const completeOnboardingSchema = updateProfileSchema.omit({
  studentNumber: true,
  registeredName: true,
  affiliation: true,
});

export type CompleteOnboardingDto = z.infer<typeof completeOnboardingSchema>;
