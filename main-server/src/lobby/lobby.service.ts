import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { LobbyDto } from './dto/lobby.dto.js';

@Injectable()
export class LobbyService {
  constructor(private readonly users: UsersService) {}

  // The onboarding check in AccessTokenGuard lets only an onboarded User in.
  async enter(userId: string): Promise<LobbyDto> {
    return { profile: this.users.profileOf(await this.users.findById(userId)) };
  }
}
