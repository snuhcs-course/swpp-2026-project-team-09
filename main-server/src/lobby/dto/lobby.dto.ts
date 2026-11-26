/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ConsentDto } from '../../users/dto/consent.dto.js';
import { ProfileDto } from '../../users/dto/profile.dto.js';

// What the app needs when it starts. Later features add to it. masterOffAsked says whether the app has asked the User,
// before they turned the Master Switch off, whether to show the building instead. consent is the account's, as the
// sign-in's answer gives it.
export interface LobbyDto {
  profile: ProfileDto;
  masterSwitch: boolean;
  masterOffAsked: boolean;
  consent: ConsentDto;
}
