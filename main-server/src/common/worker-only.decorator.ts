/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Restricts a route to the worker server, which sends what a Collection read and asks what the main server holds
// (README.md: Requests from the worker server).
export const WorkerOnly = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'worker');
