// AI-generated with Claude Opus 5.5, 2026-10-01 to 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #18 #42
import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { LobbyDto } from './dto/lobby.dto.js';

@Injectable()
export class LobbyService {
  constructor(private readonly users: UsersService) {}

  // The onboarding check in AccessTokenGuard lets only an onboarded User in.
  async enter(userId: string): Promise<LobbyDto> {
    const user = await this.users.findById(userId);
    return { profile: this.users.profileOf(user), masterSwitch: user.masterSwitchOn };
  }
}
