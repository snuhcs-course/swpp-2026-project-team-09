/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { lobbyQuery, myPartyQuery } from '@/api/queries';
import { myUserId } from '@/auth/sign-in';
import { type ActivePartyView, toActiveParty } from './adapter';

// The Party the User is in now, for the main screen's "활성 파티". Null for a User in no Party, while the answer is
// loading and after a failure: the button is shown only for a Party that is known. The Master Switch counts as on
// while the Lobby is not known, as the room has it.
export function useActiveParty(): ActivePartyView | null {
  const myParty = useQuery(myPartyQuery).data;
  const masterOn = useQuery(lobbyQuery).data?.masterSwitch !== false;
  return toActiveParty(myParty ?? null, myUserId(), masterOn);
}
