import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { routeAccess } from '../common/route-access.js';

// A User's access token is for the app: the main server's routes of a User and the socket server. An Administrator's
// has another audience (administrator.guard.ts), so each is refused where the other belongs.
export const USER_TOKEN_AUDIENCE = 'snu-now-app';

// What an access token says: the User's identifier as the subject. Its audience and expiry are the standard `aud` and
// `exp` claims.
export interface AccessTokenPayload {
  sub: string;
}

// The access token in `Authorization: Bearer <token>`, the only place a route reads it from. Its absence gets 401.
export function bearerToken(request: Request): string {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  if (type !== 'Bearer' || token === undefined) {
    throw new UnauthorizedException();
  }
  return token;
}

// Registered globally in AuthModule: every HTTP route is a User's and needs a User's access token, unless it is marked
// @Public() or @AdministratorOnly(). A missing, expired or altered token, one signed with another key, or an
// Administrator's token gets 401.
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (routeAccess(this.reflector, context) !== 'user') {
      return true;
    }
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const token = bearerToken(request);
    try {
      // AuthModule sets the User's audience as the default.
      const { sub } = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: sub };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
