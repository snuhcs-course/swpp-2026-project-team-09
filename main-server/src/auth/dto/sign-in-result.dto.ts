// AI-generated with Claude Opus 5.5, 2026-10-01, prompted by fyoon46, reviewed by TaeHyun79 in #18
import { OnboardingDto } from '../../users/dto/onboarding.dto.js';
import { TokensDto } from './tokens.dto.js';

// The answer to a sign-in. `onboarding` tells the app whether to show the onboarding screen before the lobby.
export interface SignInResultDto extends TokensDto {
  onboarding: OnboardingDto;
}
