import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { SignedInRequest } from '../common/current-user.decorator.js';
import { IS_PUBLIC } from '../common/public.decorator.js';

// What an access token says: the User's identifier as the subject. Its expiry is the standard `exp` claim.
export interface AccessTokenPayload {
  sub: string;
}

// Registered globally in AuthModule: every HTTP route needs a valid access token unless it is marked @Public().
// A missing, expired or altered token, or one signed with another key, gets 401.
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: Readonly<ExecutionContext>): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }
    const request = context.switchToHttp().getRequest<SignedInRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || token === undefined) {
      throw new UnauthorizedException();
    }
    try {
      const { sub } = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      request.user = { id: sub };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
