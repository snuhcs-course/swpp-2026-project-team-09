import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import { GLOBAL_EVENTS_KEY, matchingRequestsQuery, QUESTS_KEY } from '@/api/queries';
import type { GlobalEvent } from '@/api/types';
import { useToast } from '@/design-system';

// Whether the request for the event that stopped waiting was matched, and if so says so: its Quest is the User's now.
async function tellIfMatched(
  globalEventId: string,
  queryClient: QueryClient,
  showToast: (message: string) => void,
): Promise<void> {
  try {
    const request = await apiClient.getMatchingRequest(globalEventId);
    if (request.state !== 'matched') {
      return;
    }
    const events = queryClient.getQueryData<GlobalEvent[]>(GLOBAL_EVENTS_KEY) ?? [];
    const title = events.find(({ id }) => id === globalEventId)?.title ?? '행사';
    showToast(`${title} 파티가 만들어졌어요`);
    void queryClient.invalidateQueries({ queryKey: QUESTS_KEY });
  } catch {
    // The lists show what the main server holds; only the toast is lost.
  }
}

// Watches the User's waiting requests for Matching wherever the User is in the app. A request that waited and no
// longer does is read once more, and a match is told with a toast. Draws nothing.
export function MatchingWatch(): null {
  const { data } = useQuery(matchingRequestsQuery);
  const queryClient = useQueryClient();
  const showToast = useToast();
  const known = useRef<ReadonlySet<string> | null>(null);
  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const waiting = new Set(data.filter(({ state }) => state === 'waiting').map(({ globalEventId }) => globalEventId));
    const before = known.current;
    known.current = waiting;
    for (const globalEventId of before ?? []) {
      if (!waiting.has(globalEventId)) {
        void tellIfMatched(globalEventId, queryClient, showToast);
      }
    }
  }, [data, queryClient, showToast]);
  return null;
}
