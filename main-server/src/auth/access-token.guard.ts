import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { routeAccess } from '../common/route-access.js';

export const USER_TOKEN_AUDIENCE = 'snu-now-app';

// What an access token says: the User's identifier as the subject. Its expiry is the standard `exp` claim.
export interface AccessTokenPayload {
  sub: string;
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
