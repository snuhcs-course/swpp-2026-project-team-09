/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put } from '@nestjs/common';
import { AllowBeforeOnboarding } from '../common/allow-before-onboarding.decorator.js';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type CompleteOnboardingDto, completeOnboardingSchema } from './dto/complete-onboarding.dto.js';
import { type ConsentBodyDto, consentSchema, type UsageConsentDto, usageConsentSchema } from './dto/consent.dto.js';
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

  // The consent screen comes before onboarding. A repeat of the same version stores its choice again, so it takes no
  // Idempotency-Key.
  @AllowBeforeOnboarding()
  @Put('me/consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  agree(@CurrentUser() user: SignedInUser, @Body({ schema: consentSchema }) body: ConsentBodyDto): Promise<void> {
    return this.users.agree(user.id, body);
  }

  // The switch in 내 정보. It is open before onboarding too, as the consent it changes is.
  @AllowBeforeOnboarding()
  @Put('me/usage-consent')
  @HttpCode(HttpStatus.NO_CONTENT)
  chooseUsage(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: usageConsentSchema }) body: UsageConsentDto,
  ): Promise<void> {
    return this.users.chooseUsage(user.id, body.usage);
  }

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return toProfileDto(await this.users.updateProfile(user.id, body));
  }
}
