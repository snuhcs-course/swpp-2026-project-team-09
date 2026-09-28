import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
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
}
