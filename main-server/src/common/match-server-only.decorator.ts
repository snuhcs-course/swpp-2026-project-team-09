// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROUTE_ACCESS, RouteAccess } from './route-access.js';

// Restricts a route to the match server, which asks which requests for Matching still stand and which Quests they can
// be placed into, places them, and asks for the Shared Quest of a match (README.md: Matching).
export const MatchServerOnly = (): CustomDecorator => SetMetadata<string, RouteAccess>(ROUTE_ACCESS, 'match-server');
