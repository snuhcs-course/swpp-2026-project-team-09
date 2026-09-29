import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdministratorsService } from '../administrators/administrators.service.js';
import { SignedInAdministratorRequest } from '../common/current-administrator.decorator.js';
import { routeAccess } from '../common/route-access.js';
import { bearerToken } from './access-token.guard.js';

// An Administrator's access token is for the administrative routes alone. A User's has another audience
// (access-token.guard.ts), so each is refused where the other belongs.
export const ADMINISTRATOR_TOKEN_AUDIENCE = 'snu-now-admin';

// What an Administrator's access token says: the Administrator's id as the subject, and when it was issued, in whole
// seconds, which jsonwebtoken adds when it signs. It holds no email address. Its audience and expiry are the standard
// `aud` and `exp` claims.
export interface AdministratorTokenPayload {
  sub: string;
  iat: number;
}

// Registered globally in AuthModule: a route marked @AdministratorOnly() needs an Administrator's access token. Every
// request reads the Administrator, so a removed Administrator, or a token issued before their last sign-out, gets 401
// at once. So do a missing, expired or altered token and a User's token.
@Injectable()
export class AdministratorGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly administrators: AdministratorsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (routeAccess(this.reflector, context) !== 'administrator') {
      return true;
    }
    const request = context.switchToHttp().getRequest<SignedInAdministratorRequest>();
    const { sub, iat } = await this.verify(bearerToken(request));
    const administrator = await this.administrators.findById(sub);
    // `iat` has whole seconds and the sign-out time milliseconds. Every token issued in the second of a sign-out is
    // refused, the one issued in its very millisecond included.
    if (administrator === null || iat * 1000 <= (administrator.tokensValidAfter?.getTime() ?? 0)) {
      throw new UnauthorizedException();
    }
    request.administrator = { id: administrator.id };
    return true;
  }

  private async verify(token: string): Promise<AdministratorTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AdministratorTokenPayload>(token, {
        audience: ADMINISTRATOR_TOKEN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException();
    }
  }
}
