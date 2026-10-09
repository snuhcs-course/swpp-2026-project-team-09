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
import { routeAccess } from '../common/route-access.js';
import { Settings } from '../common/settings.js';
import { bearerToken } from './access-token.guard.js';

function digest(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

// Registered globally in AuthModule: a route marked @MatchServerOnly() needs the secret that the match server and this
// server share, MATCH_SERVER_TOKEN.
@Injectable()
export class MatchServerGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(
    private readonly reflector: Reflector,
    settings: ConfigService<Settings, true>,
  ) {
    this.expected = digest(settings.get('MATCH_SERVER_TOKEN', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    if (routeAccess(this.reflector, context) !== 'match-server') {
      return true;
    }
    // Digests have one length, and the comparison takes the same time whatever the token.
    if (!timingSafeEqual(digest(bearerToken(context.switchToHttp().getRequest<Request>())), this.expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
