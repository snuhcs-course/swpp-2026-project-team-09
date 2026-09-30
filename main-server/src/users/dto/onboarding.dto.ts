export interface ProfileSuggestionDto {
  name: string | null;
  department: string | null;
}

// Whether the User has finished onboarding. Until then, a suggestion read from the Google account's name.
export interface OnboardingDto {
  completed: boolean;
  suggestion?: ProfileSuggestionDto;
}
