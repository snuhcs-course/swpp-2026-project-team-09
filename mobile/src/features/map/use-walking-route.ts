import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { LatLng, WalkingRoute } from '@/api/types';

// The way on foot between two points. It asks nothing while either is missing.
export function useWalkingRoute(from: LatLng | null, to: LatLng | null): UseQueryResult<WalkingRoute | null> {
  return useQuery({
    queryKey: ['walking-route', from, to] as const,
    queryFn: () => (from === null || to === null ? null : apiClient.findWalkingRoute(from, to)),
    enabled: from !== null && to !== null,
  });
}
