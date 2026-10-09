/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Opens a route, or every route of a controller, to requests without an access token.
export const Public = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'public');
