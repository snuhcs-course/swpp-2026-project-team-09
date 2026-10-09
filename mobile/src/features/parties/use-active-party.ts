// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import { useQuery } from '@tanstack/react-query';
import { myPartyQuery } from '@/api/queries';
import type { MyParty } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { type ActivePartyView, toActiveParty } from './adapter';

// Defined outside the hook, so that it runs again only when the answer changes.
function activeOf(myParty: MyParty | null): ActivePartyView | null {
  return toActiveParty(myParty, myUserId());
}

// The Party the User is in now, for the main screen's "활성 파티". Null for a User in no Party, while the answer is
// loading and after a failure: the button is shown only for a Party that is known.
export function useActiveParty(): ActivePartyView | null {
  return useQuery({ ...myPartyQuery, select: activeOf }).data ?? null;
}
