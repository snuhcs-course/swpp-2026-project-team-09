/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { questsQuery } from '@/api/queries';
import { useToast } from '@/design-system';
import { partyHeldAloneFor, sharedQuestFor } from '@/features/events/adapter';

// Opens 파티 만들기 with a Global Event chosen (`/party-form?eventId=…`). A User who already holds the event's 파티 with
// others is led to its room instead, and one who holds a 파티 of it alone to that 파티's edit form, since sending a new
// one would only change it. A Quest taken alone ("여기로") still opens the blank form, which attending turns into a 파티.
export function useOpenPartyCreate(): (eventId: string) => void {
  const quests = useQuery(questsQuery).data ?? [];
  const showToast = useToast();
  return useCallback(
    (eventId: string) => {
      const alone = partyHeldAloneFor(quests, eventId);
      if (alone !== null) {
        router.push({ pathname: '/party-form', params: { questId: alone.id } });
        return;
      }
      const shared = sharedQuestFor(quests, eventId);
      if (shared === null) {
        router.push({ pathname: '/party-form', params: { eventId } });
      } else {
        router.push(`/room/${shared.id}`);
        showToast('이 행사에 함께 가는 파티가 이미 있어요');
      }
    },
    [quests, showToast],
  );
}
