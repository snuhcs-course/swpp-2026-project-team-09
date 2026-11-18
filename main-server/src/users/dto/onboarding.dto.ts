/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { User } from '../../generated/prisma/client.js';

// What the onboarding state is worked out from.
export type OnboardingSource = Pick<User, 'onboardedAt' | 'googleName'>;

export interface ProfileSuggestionDto {
  name: string | null;
  department: string | null;
}

// Whether the User has finished onboarding. Until then, the name and the department that the SNU account gives, which
// onboarding shows fixed.
export interface OnboardingDto {
  completed: boolean;
  suggestion?: ProfileSuggestionDto;
}
