/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { MapScene } from '@/api/assistant-types';
import { apiClient } from '@/api/client';
import type { WalkingRoute } from '@/api/walking-route-types';
import { endsOf, linesAlongPaths, type Walk, walksOf, walksToAsk } from '@/features/assistant/answer-walks';
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

// A scene's lines with its walks along their paths. Only the scene on screen is asked for: at most `WALKS_PER_SCENE`
// walks, each pair of ends once, never a shuttle's ride. Kakao's policy keeps a route from being stored: a path lives
// only while a scene on screen draws it (`gcTime: 0`), a request whose scene leaves the screen is given up (the query's
// `signal`), and a scene shown again asks again. A failure is retried as the everyday route's is, and not again when
// its scene comes back while it is still known. Until a walk is answered, and when it fails or finds no path, its line
// stays straight.
export function useAnswerWalks(lines: readonly MapLine[], routes: MapScene['routes']): readonly MapLine[] {
  const walks = useMemo(() => walksOf(routes), [routes]);
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
  return useMemo(() => linesAlongPaths(lines, walks, found), [lines, walks, found]);
}
