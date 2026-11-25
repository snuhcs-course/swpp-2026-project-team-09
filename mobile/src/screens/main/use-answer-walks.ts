/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type FetchStatus, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { MapScene, Plan } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import { shuttleQuery } from '@/api/queries';
import type { WalkingRoute } from '@/api/walking-route-types';
import {
  endsOf,
  linesOn,
  pathsOf,
  type Walk,
  waitingLines,
  walksOf,
  walksToAsk,
} from '@/features/assistant/answer-walks';
import { withDots } from '@/features/assistant/meal-marks';
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

// How long a walk's path is kept in the running app's memory once no scene on screen draws it (P04 ticket 75): a
// place chosen again within it draws its path at once and asks nothing.
export const WALK_KEPT_MS = 30 * 60 * 1000;

interface Answer {
  route: WalkingRoute | undefined;
  // On its way: asked, neither answered nor failed yet, and not held while the phone is offline, when the line stays
  // straight.
  waiting: boolean;
}

function answersOf(
  results: readonly { data: WalkingRoute | undefined; isPending: boolean; fetchStatus: FetchStatus }[],
): Answer[] {
  return results.map(({ data, isPending, fetchStatus }) => ({
    route: data,
    waiting: isPending && fetchStatus === 'fetching',
  }));
}

export interface WalkState {
  paths: Ways['paths'];
  waiting: ReadonlySet<string>;
}

// The paths of a scene's walks, by their lines' ids, once found, and the lines of those still on their way. Only the
// scene on screen is asked for: at most `WALKS_PER_SCENE` walks, each pair of ends once, never a shuttle's ride.
// Kakao's policy keeps a route from being stored: a path is never stored beyond the running app's memory, where it is
// kept for `WALK_KEPT_MS` after its last scene leaves the screen and is gone when the app is closed. A request whose
// scene leaves the screen is given up (the query's `signal`). A failure is retried as the everyday route's is, and not
// again when its scene comes back while it is still known. A walk failed or with no path has none.
export function useWalkPaths(walks: readonly Walk[]): WalkState {
  const asked = useMemo(() => walksToAsk(walks, WALKS_PER_SCENE), [walks]);
  const results = useQueries({
    queries: asked.map((walk) => ({
      queryKey: walkKey(walk),
      queryFn: ({ signal }: { signal: AbortSignal }): Promise<WalkingRoute> =>
        apiClient.findWalkingRoute(walk.from, walk.to, signal),
      staleTime: Infinity,
      gcTime: WALK_KEPT_MS,
      retryOnMount: false,
    })),
    combine: answersOf,
  });
  const found = useMemo(
    () =>
      new Map(
        asked.flatMap((walk, at): [string, WalkingRoute][] => {
          const route = results[at]?.route;
          return route === undefined ? [] : [[endsOf(walk), route]];
        }),
      ),
    [asked, results],
  );
  const waiting = useMemo(
    () => new Set(asked.flatMap((walk, at) => (results[at]?.waiting ? [endsOf(walk)] : []))),
    [asked, results],
  );
  return useMemo(
    () => ({ paths: pathsOf(walks, found), waiting: waitingLines(walks, waiting) }),
    [walks, found, waiting],
  );
}

// A scene's lines with its walks along their paths (`useWalkPaths`), joined onto their ends. A walk's line is not
// drawn while its path is on its way, and stays straight when it fails or finds no path.
export function useAnswerWalks(lines: readonly MapLine[], routes: MapScene['routes']): readonly MapLine[] {
  const walks = useMemo(() => walksOf(routes), [routes]);
  const { paths, waiting } = useWalkPaths(walks);
  return useMemo(() => withDots(linesOn(lines, paths, waiting)), [lines, paths, waiting]);
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
  const { paths, waiting } = useWalkPaths(walks);
  return useMemo(() => ({ paths, waiting, legs }), [paths, waiting, legs]);
}
