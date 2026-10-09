/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Restricts a route, or every route of a controller, to Administrators.
export const AdministratorOnly = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'administrator');
