// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #13 #14
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdministratorsService } from '../administrators/administrators.service.js';
import { SignedInAdministratorRequest } from '../common/current-administrator.decorator.js';
import { routeAccess } from '../common/route-access.js';
import { bearerToken } from './access-token.guard.js';

export const ADMINISTRATOR_TOKEN_AUDIENCE = 'snu-now-admin';

export interface AdministratorTokenPayload {
  sub: string;
  iat: number;
}

// Registered globally in AuthModule: a route marked @AdministratorOnly() needs an Administrator's access token. Every
// request reads the Administrator, so a removal or a sign-out takes effect at once.
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
    // `iat` has whole seconds, so a token issued in the second of a sign-out is refused too.
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
