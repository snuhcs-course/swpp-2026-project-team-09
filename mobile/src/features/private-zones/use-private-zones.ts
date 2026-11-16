/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import type { PrivateZone } from '@/api/private-zone-types';
import { PRIVATE_ZONES_KEY } from '@/api/queries';
import type { LatLng } from '@/api/types';

export interface PrivateZoneChanges {
  add: (outline: LatLng[]) => Promise<PrivateZone>;
  // A zone removed already, here or on another phone, counts as removed.
  remove: (zoneId: string) => Promise<void>;
}

// What the User changes of their Private Zones. Each change, done or refused, fetches the list again.
export function usePrivateZoneChanges(): PrivateZoneChanges {
  const queryClient = useQueryClient();
  const settle = (): Promise<void> => queryClient.invalidateQueries({ queryKey: PRIVATE_ZONES_KEY });
  return {
    add: async (outline) => {
      try {
        return await apiClient.addPrivateZone(outline);
      } finally {
        await settle();
      }
    },
    remove: async (zoneId) => {
      try {
        await apiClient.removePrivateZone(zoneId);
      } catch (error) {
        if (!isRefusal(error, 404, 'PRIVATE_ZONE_NOT_FOUND')) {
          throw error;
        }
      } finally {
        await settle();
      }
    },
  };
}
