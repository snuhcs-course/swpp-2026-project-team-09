/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ApiClient } from '@/api/client';
import type { PrivateZone } from '@/api/private-zone-types';
import { field, hasTexts, isNothing, isPoint, listOf } from './answers';
import { call } from './http';

// The Private Zones' routes (main-server's README, Private Zones).

export function isPrivateZone(value: unknown): value is PrivateZone {
  return hasTexts(value, ['id', 'label', 'createdAt']) && listOf(isPoint)(field(value, 'outline'));
}

function isPrivateZones(value: unknown): value is { zones: PrivateZone[] } {
  return listOf(isPrivateZone)(field(value, 'zones'));
}

type PrivateZoneClient = Pick<ApiClient, 'privateZones' | 'addPrivateZone' | 'removePrivateZone'>;

export const privateZoneClient: PrivateZoneClient = {
  privateZones: async () => (await call('GET', '/users/me/private-zones', isPrivateZones)).zones,
  // Each point as latitude and longitude alone, which is all the main server takes.
  addPrivateZone: (outline) =>
    call('POST', '/users/me/private-zones', isPrivateZone, {
      body: { outline: outline.map(({ latitude, longitude }) => ({ latitude, longitude })) },
    }),
  removePrivateZone: async (zoneId) => {
    await call('DELETE', `/users/me/private-zones/${encodeURIComponent(zoneId)}`, isNothing);
  },
};
