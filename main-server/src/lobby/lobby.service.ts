import { ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { LobbyDto } from './dto/lobby.dto.js';

@Injectable()
export class LobbyService {
  constructor(private readonly users: UsersService) {}

  async enter(userId: string): Promise<LobbyDto> {
    const user = await this.users.findById(userId);
    const onboarding = this.users.onboardingOf(user);
    if (!onboarding.completed) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        code: 'ONBOARDING_REQUIRED',
        message: 'Complete onboarding first.',
        onboarding,
      });
    }
    return { profile: this.users.profileOf(user) };
  }
}
