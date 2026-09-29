import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ADMINISTRATOR_ONLY } from '../common/administrator-only.decorator.js';
import { SignedInUser } from '../common/current-user.decorator.js';
import { Settings } from '../common/settings.js';
import { UsersService } from '../users/users.service.js';

// The access token names only the User, so the email address is read and compared with the list on every request.
@Injectable()
export class AdministratorGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UsersService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const administratorOnly = this.reflector.getAllAndOverride<boolean | undefined>(ADMINISTRATOR_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (administratorOnly !== true) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user?: SignedInUser }>();
    // AccessTokenGuard lets a route marked @Public() through without putting a User on the request.
    if (user === undefined) {
      throw new UnauthorizedException();
    }
    const { email } = await this.users.findById(user.id);
    // The list is kept in lower case (see settings.ts).
    if (!this.settings.get('ADMINISTRATOR_EMAILS', { infer: true }).includes(email.toLowerCase())) {
      throw new ForbiddenException('Only an Administrator can use this route.');
    }
    return true;
  }
}
