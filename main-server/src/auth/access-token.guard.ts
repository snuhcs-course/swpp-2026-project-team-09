import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { routeAccess } from '../common/route-access.js';
import { EndedSessions, SessionEnd } from './ended-sessions.js';

export const USER_TOKEN_AUDIENCE = 'snu-now-app';

// What an access token says: the User's identifier as the subject, and the session (the refresh token family) as
// OpenID Connect's `sid`. Its expiry is the standard `exp` claim.
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
// token.
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly endedSessions: EndedSessions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (routeAccess(this.reflector, context) !== 'user') {
      return true;
    }
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const token = bearerToken(request);
    let payload: AccessTokenPayload;
    try {
      // AuthModule sets the User's audience as the default.
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    await this.refuseEndedSession(payload.sid);
    request.user = { id: payload.sub };
    return true;
  }

  // 503 rather than 401 while Redis cannot be reached, so that the app tries again instead of signing the User out.
  private async refuseEndedSession(sessionId: string): Promise<void> {
    let end: SessionEnd | undefined;
    try {
      end = await this.endedSessions.find(sessionId);
    } catch {
      throw new ServiceUnavailableException();
    }
    if (end === 'replaced') {
      throw new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        error: 'Unauthorized',
        code: 'SESSION_REPLACED',
        message: 'A sign-in on another phone ended this session.',
      });
    }
    if (end !== undefined) {
      throw new UnauthorizedException();
    }
  }
}
