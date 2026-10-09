// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #5 #14
import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Opens a route, or every route of a controller, to requests without an access token.
export const Public = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'public');
