import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ADMINISTRATOR_ONLY } from '../common/administrator-only.decorator.js';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { Settings } from '../common/settings.js';
import { UsersService } from '../users/users.service.js';

// Registered globally in AuthModule after AccessTokenGuard, so a request without a valid access token has already got
// 401. On a route marked @AdministratorOnly(), only a User whose email address is in ADMINISTRATOR_EMAILS passes, and
// another User gets 403. The access token names only the User, so the address is read and compared with the list on
// every request.
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
    const { user } = context.switchToHttp().getRequest<SignedInRequest>();
    const { email } = await this.users.findById(user.id);
    // The list is kept in lower case (see settings.ts).
    if (!this.settings.get('ADMINISTRATOR_EMAILS', { infer: true }).includes(email.toLowerCase())) {
      throw new ForbiddenException('Only an Administrator can use this route.');
    }
    return true;
  }
}
