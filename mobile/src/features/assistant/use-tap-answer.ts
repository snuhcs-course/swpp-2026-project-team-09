/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CardFact, Lookup, LookupCard, Tapped } from '@/api/lookup-types';
import type { LatLng } from '@/api/types';
import { CAMPUS_BOUNDS, isInside } from '@/map';
import { usePosition } from '@/position';
import { useAnswerSwitch } from './answer-switch';

// The main server's answer to a building or a Friend's face pressed on the map (POST /assistant/taps): its card while
// it is asked, after a failure, and once it came.
export interface TapAnswer {
  // The answer with its card, null until it came and after a failure.
  answer: (Lookup & { card: LookupCard }) | null;
  failed: boolean;
  // Asks again after a failure.
  retry: () => void;
}

function withCard(lookup: Lookup): (Lookup & { card: LookupCard }) | null {
  const { card } = lookup;
  return card === undefined || card === null ? null : { ...lookup, card };
}

function idOf(tapped: Tapped | null): string | null {
  if (tapped === null) {
    return null;
  }
  return tapped.kind === 'place' ? tapped.placeId : tapped.userId;
}

// The User's position while it is on campus, as a request context and a recalculation send it; null otherwise.
export function useCampusPosition(): LatLng | null {
  const { position } = usePosition();
  return position !== null && isInside(position, CAMPUS_BOUNDS) ? position : null;
}

// Asks the main server about what was pressed, with where the User is when it is asked, and nothing for null. The
// answer is kept for the same thing pressed again, which asks again behind it. An answer without a card counts as a
// failure.
export function useTapAnswer(tapped: Tapped | null): TapAnswer {
  const location = useCampusPosition();
  const query = useQuery({
    queryKey: ['assistant-tap', tapped?.kind ?? null, idOf(tapped)],
    queryFn: () =>
      tapped === null ? Promise.reject(new Error('Nothing pressed')) : apiClient.answerTap(tapped, location),
    enabled: tapped !== null,
    select: withCard,
  });
  const answer = query.data ?? null;
  const asking = query.isFetching && answer === null;
  return {
    answer,
    failed: !asking && (query.isError || (query.isSuccess && answer === null)),
    retry: () => {
      void query.refetch();
    },
  };
}

// The fact lines of the main server's card of a Friend's face (row 6's decision D11), asked while the switch of the
// answer on the map is on; null while they are asked, after a failure, with the switch off, and for no Friend.
export function useFriendFacts(userId: string | null): readonly CardFact[] | null {
  const onMap = useAnswerSwitch();
  const { answer } = useTapAnswer(onMap && userId !== null ? { kind: 'friend', userId } : null);
  return answer?.card.facts ?? null;
}
