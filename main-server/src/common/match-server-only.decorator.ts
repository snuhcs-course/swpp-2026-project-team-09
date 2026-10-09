/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Restricts a route to the match server, which asks which requests for Matching still stand and which Quests they can
// be placed into, places them, and asks for the Shared Quest of a match (README.md: Matching).
export const MatchServerOnly = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'match-server');
