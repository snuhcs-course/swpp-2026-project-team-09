/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type QueryClient, useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { MapScene } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { WalkingRoute } from '@/api/walking-route-types';
import { linesAlongPaths, type Walk, walksOf } from '@/features/assistant/answer-walks';
import { WALKING_ROUTE_KEY } from '@/features/map/use-walking-route';
import type { MapLine } from '@/map';

// At most this many ways of a scene are asked at once; the next is asked when one is answered. A Plan of two people
// has two to four walks (each person's way, and the User's way on to the next Class), so three asks the User's way
// and a Friend's together; a scene of a whole Party, one way a person and their next Classes, does not send a burst
// of requests, each of which the main server passes on to Kakao and may wait 5 seconds for.
export const WALKS_AT_ONCE = 3;

// The everyday route's key carries an asking count and no start, so the two never share an entry: an answer's walk is
// asked once for its two ends and kept while the answer is around.
function walkKey({ from, to }: Walk): readonly unknown[] {
  return [...WALKING_ROUTE_KEY, 'walk', from.latitude, from.longitude, to.latitude, to.longitude];
}

function settled(client: QueryClient, walk: Walk): boolean {
  const status = client.getQueryState(walkKey(walk))?.status;
  return status === 'success' || status === 'error';
}

function dataOf(results: readonly { data: WalkingRoute | undefined }[]): (WalkingRoute | undefined)[] {
  return results.map(({ data }) => data);
}

// A scene's lines with each walked route along its path: the scene on screen's walks are asked, `WALKS_AT_ONCE` at a
// time in the scene's order (the User's first), and a shuttle's ride is never asked. Until a walk is answered, and when
// it fails or finds no path, its line stays straight.
export function useAnswerWalks(lines: readonly MapLine[], routes: MapScene['routes']): readonly MapLine[] {
  const client = useQueryClient();
  const walks = useMemo(() => walksOf(routes), [routes]);
  let waiting = 0;
  const queries = walks.map((walk) => {
    const done = settled(client, walk);
    const enabled = done || waiting < WALKS_AT_ONCE;
    if (!done) {
      waiting += 1;
    }
    return {
      queryKey: walkKey(walk),
      queryFn: (): Promise<WalkingRoute> => apiClient.findWalkingRoute(walk.from, walk.to),
      enabled,
      staleTime: Infinity,
    };
  });
  const found = useQueries({ queries, combine: dataOf });
  return useMemo(() => linesAlongPaths(lines, walks, found), [lines, walks, found]);
}
