import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Gives a route, or every route of a controller, to Administrators alone. It needs an Administrator's access token, and
// a User's access token gets 401.
export const AdministratorOnly = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'administrator');
