/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { MapScene, Plan } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { shuttleQuery } from '@/api/queries';
import type { WalkingRoute } from '@/api/walking-route-types';
import { endsOf, linesOn, pathsOf, type Walk, walksOf, walksToAsk } from '@/features/assistant/answer-walks';
import { type WalkPaths, withDots } from '@/features/assistant/meal-marks';
import { shuttleLegsOf, shuttleWalks, type Ways } from '@/features/assistant/shuttle-legs';
import type { MapLine } from '@/map';

// At most this many walks of the scene on screen are asked for: a Plan of three people has the User's way and the
// two Friends' ways to the place, and the way on to the next Class comes after them. Each costs one route of the
// team's Kakao quota of 1,000 a day (`main-server/README.md`), so a larger scene keeps its other walks straight.
export const WALKS_PER_SCENE = 3;

// Apart from the everyday route's key, whose entries hold the User's own askings.
const ANSWER_WALK_KEY = ['answer-walk'] as const;

function walkKey(walk: Walk): readonly unknown[] {
  return [...ANSWER_WALK_KEY, endsOf(walk)];
}

function dataOf(results: readonly { data: WalkingRoute | undefined }[]): (WalkingRoute | undefined)[] {
  return results.map(({ data }) => data);
}

// The paths of a scene's walks, by their lines' ids, once found. Only the scene on screen is asked for: at most
// `WALKS_PER_SCENE` walks, each pair of ends once, never a shuttle's ride. Kakao's policy keeps a route from being
// stored: a path lives only while a scene on screen draws it (`gcTime: 0`), a request whose scene leaves the screen is
// given up (the query's `signal`), and a scene shown again asks again. A failure is retried as the everyday route's
// is, and not again when its scene comes back while it is still known. A walk not answered yet, failed, or with no
// path has none.
export function useWalkPaths(walks: readonly Walk[]): WalkPaths {
  const asked = useMemo(() => walksToAsk(walks, WALKS_PER_SCENE), [walks]);
  const results = useQueries({
    queries: asked.map((walk) => ({
      queryKey: walkKey(walk),
      queryFn: ({ signal }: { signal: AbortSignal }): Promise<WalkingRoute> =>
        apiClient.findWalkingRoute(walk.from, walk.to, signal),
      staleTime: Infinity,
      gcTime: 0,
      retryOnMount: false,
    })),
    combine: dataOf,
  });
  const found = useMemo(
    () =>
      new Map(
        asked.flatMap((walk, at): [string, WalkingRoute][] => {
          const route = results[at];
          return route === undefined ? [] : [[endsOf(walk), route]];
        }),
      ),
    [asked, results],
  );
  return useMemo(() => pathsOf(walks, found), [walks, found]);
}

// A scene's lines with its walks along their paths (`useWalkPaths`), joined onto their ends; until a walk is
// answered, and when it fails or finds no path, its line stays straight.
export function useAnswerWalks(lines: readonly MapLine[], routes: MapScene['routes']): readonly MapLine[] {
  const walks = useMemo(() => walksOf(routes), [routes]);
  const paths = useWalkPaths(walks);
  return useMemo(() => withDots(linesOn(lines, paths)), [lines, paths]);
}

const NO_ROUTES: MapScene['routes'] = [];

// A meal Plan's ways (P04 ticket 41): its walks' paths, those to and from the stops of its legs by the shuttle among
// them, and those legs, along the shuttle's road line once its route is known.
export function useMealWays(plan: Plan | undefined): Ways {
  const routes = plan?.scene.routes ?? NO_ROUTES;
  const byShuttle = routes.some(({ mode }) => mode === 'shuttle');
  const { data: shuttle = null } = useQuery({ ...shuttleQuery, enabled: byShuttle });
  const legs = useMemo(
    () => (plan === undefined || !byShuttle ? [] : shuttleLegsOf(plan, shuttle)),
    [plan, byShuttle, shuttle],
  );
  const walks = useMemo(() => [...walksOf(routes), ...shuttleWalks(legs)], [routes, legs]);
  const paths = useWalkPaths(walks);
  return useMemo(() => ({ paths, legs }), [paths, legs]);
}
