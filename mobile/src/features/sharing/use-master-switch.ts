/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { apiClient } from '@/api/client';
import { FRIENDS_KEY, LOBBY_KEY, lobbyQuery, POSITIONS_KEY } from '@/api/queries';
import type { Lobby } from '@/api/types';
import { useToast } from '@/design-system';

const NOT_CHANGED = '위치 공유를 바꾸지 못했어요';

function masterSwitchOf(lobby: Lobby): boolean {
  return lobby.masterSwitch;
}

export interface MasterSwitch {
  on: boolean;
  // Shows the new state at once, and the old one again with a toast when the main server did not take it.
  turn: (on: boolean) => void;
}

// The User's Master Switch, as the Lobby holds it. A change changes whom the User sees, so the Friends and their
// positions are fetched again after it.
export function useMasterSwitch(): MasterSwitch {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const on = useQuery({ ...lobbyQuery, select: masterSwitchOf }).data === true;
  const turn = useCallback(
    (next: boolean) => {
      const show = (value: boolean): void => {
        queryClient.setQueryData<Lobby>(LOBBY_KEY, (lobby) => lobby && { ...lobby, masterSwitch: value });
      };
      show(next);
      apiClient.setMasterSwitch(next).then(
        () => {
          void queryClient.invalidateQueries({ queryKey: FRIENDS_KEY });
          void queryClient.invalidateQueries({ queryKey: POSITIONS_KEY });
        },
        () => {
          show(!next);
          showToast(NOT_CHANGED);
        },
      );
    },
    [queryClient, showToast],
  );
  return { on, turn };
}
