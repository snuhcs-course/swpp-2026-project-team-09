// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #51
import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { apiClient } from '@/api/client';
import type { LatLng } from '@/api/types';
import type { WalkingRoute } from '@/api/walking-route-types';

export const WALKING_ROUTE_KEY = ['walking-route'] as const;

export interface WalkingRouteState {
  // Undefined while nothing was asked, while it is loading and after a failure.
  route: WalkingRoute | undefined;
  isPending: boolean;
  isError: boolean;
  // Asks the way from where the User is at that moment. Asking again replaces the route.
  ask: (from: LatLng, to: LatLng) => void;
  // Drops the route. A screen calls it when the route is dismissed or the screen is left.
  clear: () => void;
}

interface Asking {
  from: LatLng;
  to: LatLng;
  // Which asking of the app this is, so that two askings never share an answer.
  count: number;
}

let askings = 0;

// The way on foot to a place, asked when the User asks. The start is not in the key: a position that moves must not
// ask again, so the route stays the one from where the User asked until `ask` is called once more.
export function useWalkingRoute(): WalkingRouteState {
  const [asking, setAsking] = useState<Asking | null>(null);
  const { data, isPending, isError } = useQuery({
    queryKey: [...WALKING_ROUTE_KEY, asking?.to ?? null, asking?.count ?? 0] as const,
    queryFn:
      asking === null ? skipToken : (): Promise<WalkingRoute> => apiClient.findWalkingRoute(asking.from, asking.to),
  });
  const ask = useCallback((from: LatLng, to: LatLng): void => {
    askings += 1;
    setAsking({ from, to, count: askings });
  }, []);
  const clear = useCallback((): void => {
    setAsking(null);
  }, []);
  return {
    route: asking === null ? undefined : data,
    isPending: asking !== null && isPending,
    isError: asking !== null && isError,
    ask,
    clear,
  };
}
