/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC } from './public.decorator.js';
import { Settings } from './settings.js';

function digest(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

// Registered globally in AppModule: every route not marked @Public() is the main server's, and needs the secret that
// the two servers share, MATCH_SERVER_TOKEN.
@Injectable()
export class MainServerGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(
    private readonly reflector: Reflector,
    settings: ConfigService<Settings, true>,
  ) {
    this.expected = digest(settings.get('MATCH_SERVER_TOKEN', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }
    const [type, token] = context.switchToHttp().getRequest<Request>().headers.authorization?.split(' ') ?? [];
    // Digests have one length, and the comparison takes the same time whatever the token.
    if (type !== 'Bearer' || token === undefined || !timingSafeEqual(digest(token), this.expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
