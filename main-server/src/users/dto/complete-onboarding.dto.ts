/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { departmentSchema, nameSchema, updateProfileSchema } from './update-profile.dto.js';

// The profile that the app's onboarding sends. Unlike an edit, it must hold the name and the department.
export const completeOnboardingSchema = updateProfileSchema.extend({
  name: nameSchema,
  department: departmentSchema,
});

export type CompleteOnboardingDto = z.infer<typeof completeOnboardingSchema>;
