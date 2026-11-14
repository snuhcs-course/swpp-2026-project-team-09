/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { WAITING } from '@/live/live-updates';
import { onPushArrival, quietPushesInFront } from './device';

// A push that arrives while the app is in front goes to the notification list only, and the app fetches again the
// lists that 알림 and the badge on 파티 show. Draws nothing.
export function PushArrivals(): null {
  const queryClient = useQueryClient();
  useEffect(() => {
    quietPushesInFront();
    return onPushArrival(() => {
      for (const queryKey of WAITING) {
        void queryClient.invalidateQueries({ queryKey });
      }
    });
  }, [queryClient]);
  return null;
}
