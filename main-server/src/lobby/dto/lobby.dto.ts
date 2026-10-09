// AI-generated with Claude Opus 5.5, 2026-10-01 to 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #18 #42
import { ProfileDto } from '../../users/dto/profile.dto.js';

// What the app needs when it starts. Later features add to it.
export interface LobbyDto {
  profile: ProfileDto;
  masterSwitch: boolean;
}
