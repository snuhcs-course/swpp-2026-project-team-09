/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ProfileDto } from '../../users/dto/profile.dto.js';

// What the app needs when it starts. Later features add to it.
export interface LobbyDto {
  profile: ProfileDto;
  masterSwitch: boolean;
}
