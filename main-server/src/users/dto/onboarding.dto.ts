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
