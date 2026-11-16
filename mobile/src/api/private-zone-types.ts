/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LatLng } from './types';

// --- Private Zones (GET, POST /users/me/private-zones; DELETE /users/me/private-zones/:id) ---

// An area the User drew round on the map, inside which their position is not kept and no one sees it.
export interface PrivateZone {
  id: string;
  // "301동 근처", or "그린 구역" when no Place is near its middle.
  label: string;
  // 3 to 200 points, left open: the last joins the first.
  outline: LatLng[];
  createdAt: string;
}
