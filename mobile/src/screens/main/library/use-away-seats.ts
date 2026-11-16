/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { LibrarySpace } from '@/api/assistant-types';
import { studySpacesQuery } from '@/api/queries';
import { now } from '@/clock';
import type { AwaySeats } from '@/features/assistant/study-area';
import { tappedSlot } from '@/library/cards/made';
import { freeSeats } from '@/library/cards/seats';
import { useLibrarySession } from '@/library/library-session';
import { seatsFor } from './use-room-counts';

const MINUTE_MS = 60_000;
const NO_SECTORS: readonly LibrarySpace[] = [];

// The free seats of the sectors, each for the time a tapped seat would be booked for (`tappedSlot`), added up; null
// when no sector could be read.
async function freeOf(sectors: readonly LibrarySpace[]): Promise<number | null> {
  const at = now();
  const read = await Promise.allSettled(
    sectors.map((sector) => seatsFor(sector, tappedSlot(sector, at, { start: null, minutes: null }))),
  );
  const counts = read.flatMap((result) => (result.status === 'fulfilled' ? [freeSeats(result.value).length] : []));
  return counts.length === 0 ? null : counts.reduce((sum, count) => sum + count, 0);
}

// The free seats of the Place an `away` flag points to (관정관), read by the phone from its own library session: the
// seat sectors the 공부공간 layer gives for that Place, which the main server cut by 소속. Null without a session, for a
// Place with no seat sectors, or while nothing was read. The count never goes to the main server.
export function useAwaySeats(placeId: string | null): AwaySeats | null {
  const { loggedIn } = useLibrarySession();
  const on = placeId !== null && loggedIn;
  const layer = useQuery({ ...studySpacesQuery, enabled: on });
  const sectors =
    layer.data?.find(({ place, liveSeats }) => liveSeats !== null && place.id === placeId)?.liveSeats?.sectors ??
    NO_SECTORS;
  const free = useQuery({
    queryKey: ['library', 'away-seats', placeId],
    queryFn: () => freeOf(sectors),
    enabled: on && sectors.length > 0,
    staleTime: MINUTE_MS,
  });
  const count = on ? (free.data ?? null) : null;
  return useMemo(() => (placeId === null || count === null ? null : { placeId, free: count }), [placeId, count]);
}
