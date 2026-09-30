import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { AllowBeforeOnboarding } from '../common/allow-before-onboarding.decorator.js';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type CompleteOnboardingDto, completeOnboardingSchema } from './dto/complete-onboarding.dto.js';
import { ProfileDto, toProfileDto } from './dto/profile.dto.js';
import { type UpdateProfileDto, updateProfileSchema } from './dto/update-profile.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: SignedInUser): Promise<UserDto> {
    const { id, email } = await this.users.findById(user.id);
    return { id, email };
  }

  @Get('me/profile')
  async profile(@CurrentUser() user: SignedInUser): Promise<ProfileDto> {
    return toProfileDto(await this.users.findById(user.id));
  }

  // The app sends it again when the answer was lost. A repeat saves the profile again, so it takes no Idempotency-Key.
  @AllowBeforeOnboarding()
  @Post('me/onboarding')
  @HttpCode(HttpStatus.NO_CONTENT)
  completeOnboarding(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: completeOnboardingSchema }) body: CompleteOnboardingDto,
  ): Promise<void> {
    return this.users.completeOnboarding(user.id, body);
  }

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return toProfileDto(await this.users.updateProfile(user.id, body));
  }
}
