/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

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
