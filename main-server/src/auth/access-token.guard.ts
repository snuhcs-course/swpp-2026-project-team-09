import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { allowsBeforeOnboarding } from '../common/allow-before-onboarding.decorator.js';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { routeAccess } from '../common/route-access.js';
import { UsersService } from '../users/users.service.js';
import { SessionsService } from './sessions.service.js';

export const USER_TOKEN_AUDIENCE = 'snu-now-app';

// What an access token says: the User's identifier as the subject, and the session as OpenID Connect's `sid`. Its
// expiry is the standard `exp` claim.
export interface AccessTokenPayload {
  sub: string;
  sid: string;
}

export function bearerToken(request: Request): string {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  if (type !== 'Bearer' || token === undefined) {
    throw new UnauthorizedException();
  }
  return token;
}

// Registered globally in AuthModule: a route marked neither @Public() nor @AdministratorOnly() needs a User's access
// token. Every request reads the session, so an access token of a session that has ended is refused at once. A User
// who has not finished onboarding gets 403 on every such route but those marked @AllowBeforeOnboarding().
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (routeAccess(this.reflector, context) !== 'user') {
      return true;
    }
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const { sub, sid } = await this.verify(bearerToken(request));
    const session = await this.sessions.find(sid);
    if (session?.endReason === 'replaced') {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        code: 'SESSION_REPLACED',
        message: 'A sign-in on another phone ended this session.',
      });
    }
    if (session === null || session.endedAt !== null) {
      throw new UnauthorizedException();
    }
    if (session.user.onboardedAt === null && !allowsBeforeOnboarding(this.reflector, context)) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        code: 'ONBOARDING_REQUIRED',
        message: 'Complete onboarding first.',
        onboarding: this.users.onboardingOf(session.user),
      });
    }
    request.user = { id: sub, sessionId: sid };
    return true;
  }

  private async verify(token: string): Promise<AccessTokenPayload> {
    let payload: Partial<AccessTokenPayload>;
    try {
      // AuthModule sets the User's audience as the default.
      payload = await this.jwt.verifyAsync<Partial<AccessTokenPayload>>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (payload.sub === undefined || payload.sid === undefined) {
      throw new UnauthorizedException();
    }
    return { sub: payload.sub, sid: payload.sid };
  }
}
