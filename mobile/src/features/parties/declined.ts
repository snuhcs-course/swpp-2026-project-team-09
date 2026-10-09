// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { DECLINED_PARTIES_KEY } from '@/api/queries';
import { keep, readKept } from '@/storage/kept';

// The running Parties whose 활성화 the User declined. The main server stores no decline, so the phone keeps it, and
// another phone of the User asks again.
export const declinedPartiesQuery = queryOptions({
  queryKey: DECLINED_PARTIES_KEY,
  queryFn: async () => (await readKept()).declinedParties,
  staleTime: Infinity,
});

export function useDeclineParty(): (partyId: string) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (partyId: string) => {
      queryClient.setQueryData<string[]>(DECLINED_PARTIES_KEY, (declined = []) => [...declined, partyId]);
      void readKept()
        .then(({ declinedParties }) => keep({ declinedParties: [...declinedParties, partyId] }))
        .catch(() => null);
    },
    [queryClient],
  );
}
