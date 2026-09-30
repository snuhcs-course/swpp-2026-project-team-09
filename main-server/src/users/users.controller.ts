import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
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

  @Patch('me/profile')
  async updateProfile(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileDto,
  ): Promise<ProfileDto> {
    return toProfileDto(await this.users.updateProfile(user.id, body));
  }
}
