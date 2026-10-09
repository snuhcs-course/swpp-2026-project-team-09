// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by fyoon46, reviewed by fyoon46 in #31
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

// Registered globally in AuthModule: a route marked @WorkerOnly() needs the token that the worker server and this
// server share, WORKER_TOKEN. It is a secret of the deployment, not a signed token: the worker is no User.
@Injectable()
export class WorkerGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(
    private readonly reflector: Reflector,
    settings: ConfigService<Settings, true>,
  ) {
    this.expected = digest(settings.get('WORKER_TOKEN', { infer: true }));
  }

  canActivate(context: ExecutionContext): boolean {
    if (routeAccess(this.reflector, context) !== 'worker') {
      return true;
    }
    // Digests have one length, and the comparison takes the same time whatever the token.
    if (!timingSafeEqual(digest(bearerToken(context.switchToHttp().getRequest<Request>())), this.expected)) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
