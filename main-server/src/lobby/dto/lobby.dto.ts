import { ProfileDto } from '../../users/dto/profile.dto.js';

// What the app needs when it starts. Later features add to it.
export interface LobbyDto {
  profile: ProfileDto;
  masterSwitch: boolean;
}
