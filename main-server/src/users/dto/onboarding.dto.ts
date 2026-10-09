// AI-generated with Claude Opus 5.5, 2026-10-01, prompted by fyoon46, reviewed by TaeHyun79 in #18
import { User } from '../../generated/prisma/client.js';

// What the onboarding state is worked out from.
export type OnboardingSource = Pick<User, 'onboardedAt' | 'googleName'>;

export interface ProfileSuggestionDto {
  name: string | null;
  department: string | null;
}

// Whether the User has finished onboarding. Until then, a suggestion read from the Google account's name.
export interface OnboardingDto {
  completed: boolean;
  suggestion?: ProfileSuggestionDto;
}
