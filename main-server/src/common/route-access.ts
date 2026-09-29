import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Who may call a route: anyone, a User or an Administrator. @Public() and @AdministratorOnly() set this one key, and a
// marking on a handler replaces its controller's, so every route is exactly one of the three. AccessTokenGuard checks
// a User's routes and AdministratorGuard an Administrator's; neither accepts the other's access token.
export const ROUTE_ACCESS = 'routeAccess';

export type RouteAccess = 'public' | 'user' | 'administrator';

// A route marked neither @Public() nor @AdministratorOnly() is a User's.
export function routeAccess(reflector: Reflector, context: ExecutionContext): RouteAccess {
  return (
    reflector.getAllAndOverride<RouteAccess | undefined>(ROUTE_ACCESS, [context.getHandler(), context.getClass()]) ??
    'user'
  );
}
