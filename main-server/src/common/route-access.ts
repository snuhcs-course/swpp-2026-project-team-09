// AI-generated with Claude Opus 5.5, 2026-09-29 to 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 and fyoon46 in #14 #31 #48
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// @Public(), @AdministratorOnly(), @WorkerOnly() and @MatchServerOnly() set this one key, so a handler's marking
// replaces its controller's and every route is exactly one kind.
export const ROUTE_ACCESS = 'routeAccess';

export type RouteAccess = 'public' | 'user' | 'administrator' | 'worker' | 'match-server';

export function routeAccess(reflector: Reflector, context: ExecutionContext): RouteAccess {
  return (
    reflector.getAllAndOverride<RouteAccess | undefined>(ROUTE_ACCESS, [context.getHandler(), context.getClass()]) ??
    'user'
  );
}
