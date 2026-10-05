import { useQuery } from '@tanstack/react-query';
import { partyNewsQuery } from '@/api/queries';
import { toPartyBadge } from './adapter';

// The number on the bottom navigation's 파티: how many things wait for the User in Parties. It is the app's own and
// never fails a screen: while it is loading, and when it failed, there is no badge.
export function usePartyBadge(): number {
  return toPartyBadge(useQuery(partyNewsQuery).data);
}
