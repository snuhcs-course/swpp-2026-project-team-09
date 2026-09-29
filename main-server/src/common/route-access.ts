import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// @Public() and @AdministratorOnly() set this one key, so a handler's marking replaces its controller's and every route
// is exactly one kind.
export const ROUTE_ACCESS = 'routeAccess';

export type RouteAccess = 'public' | 'user' | 'administrator';

export function routeAccess(reflector: Reflector, context: ExecutionContext): RouteAccess {
  return (
    reflector.getAllAndOverride<RouteAccess | undefined>(ROUTE_ACCESS, [context.getHandler(), context.getClass()]) ??
    'user'
  );
}
