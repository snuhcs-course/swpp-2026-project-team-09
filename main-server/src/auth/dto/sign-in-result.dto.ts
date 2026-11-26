/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ConsentDto } from '../../users/dto/consent.dto.js';
import { OnboardingDto } from '../../users/dto/onboarding.dto.js';
import { TokensDto } from './tokens.dto.js';

// The answer to a sign-in. `onboarding` tells the app whether to show the onboarding screen before the lobby, and
// `consent` is the account's, so that a new phone does not ask for it again.
export interface SignInResultDto extends TokensDto {
  onboarding: OnboardingDto;
  consent: ConsentDto;
}
