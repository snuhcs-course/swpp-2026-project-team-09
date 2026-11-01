/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { departmentSchema, nameSchema, updateProfileSchema } from './update-profile.dto.js';

// The profile that the app's onboarding sends. Unlike an edit, it must hold the name and the department. The 학번, the
// registered name and the 소속 are the edit's only: sent here, they are left out.
export const completeOnboardingSchema = updateProfileSchema
  .omit({ studentNumber: true, registeredName: true, affiliation: true })
  .extend({ name: nameSchema, department: departmentSchema });

export type CompleteOnboardingDto = z.infer<typeof completeOnboardingSchema>;
