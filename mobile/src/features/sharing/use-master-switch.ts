/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
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

function masterOffAskedOf(lobby: Lobby): boolean {
  return lobby.masterOffAsked;
}

export interface MasterSwitch {
  on: boolean;
  // Known to be off: false while the Lobby is still loading, so nothing is held off before the app knows.
  off: boolean;
  // Shows the new state at once, and the old one again with a toast when the main server did not take it. `done` is
  // the toast once it did. True once it did.
  turn: (on: boolean, done?: string) => Promise<boolean>;
  // Whether the app has asked the User before they turned it off, and the record that it did.
  offAsked: boolean;
  markOffAsked: () => void;
}

// The User's Master Switch, as the Lobby holds it. A change changes whom the User sees, so the Friends and their
// positions are fetched again after it.
export function useMasterSwitch(): MasterSwitch {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const shown = useQuery({ ...lobbyQuery, select: masterSwitchOf }).data;
  const on = shown === true;
  const off = shown === false;
  const offAsked = useQuery({ ...lobbyQuery, select: masterOffAskedOf }).data === true;
  const turn = useCallback(
    (next: boolean, done?: string) => {
      const show = (value: boolean): void => {
        queryClient.setQueryData<Lobby>(LOBBY_KEY, (lobby) => lobby && { ...lobby, masterSwitch: value });
      };
      show(next);
      return apiClient.setMasterSwitch(next).then(
        () => {
          void queryClient.invalidateQueries({ queryKey: FRIENDS_KEY });
          void queryClient.invalidateQueries({ queryKey: POSITIONS_KEY });
          if (done !== undefined) {
            showToast(done);
          }
          return true;
        },
        () => {
          show(!next);
          showToast(NOT_CHANGED);
          return false;
        },
      );
    },
    [queryClient, showToast],
  );
  // Kept at once, so that the question is not asked again in this run whether the record reaches the main server.
  const markOffAsked = useCallback(() => {
    queryClient.setQueryData<Lobby>(LOBBY_KEY, (lobby) => lobby && { ...lobby, masterOffAsked: true });
    void apiClient.recordMasterOffAsked().catch(() => null);
  }, [queryClient]);
  return { on, off, turn, offAsked, markOffAsked };
}
