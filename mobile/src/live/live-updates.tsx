import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { FRIENDS_KEY, GLOBAL_EVENTS_KEY, MY_PARTY_KEY, PARTIES_KEY, POSITIONS_KEY, QUESTS_KEY } from '@/api/queries';
import { renewSession } from '@/api/server/http';
import { asksMainServer, socketServerUrl } from '@/api/servers';
import type { Friend, MyParty, Position } from '@/api/types';
import { heldTokens } from '@/auth/tokens';
import { useSession } from '@/session/session';
import { endSession } from '@/session/session-events';
import { openLiveConnection } from './connection';

// What each signal of the main server makes the app fetch again. The signals carry nothing. `meetups-changed` and
// `matching-changed` name nothing these screens show; an accepted Meetup also sends `quests-changed`.
const REFETCH: Record<string, readonly QueryKey[]> = {
  'friends-changed': [FRIENDS_KEY, POSITIONS_KEY],
  'quests-changed': [QUESTS_KEY],
  // Who is in the User's Party changes whom the User sees.
  'party-changed': [MY_PARTY_KEY, PARTIES_KEY, POSITIONS_KEY],
  'global-events-changed': [GLOBAL_EVENTS_KEY, QUESTS_KEY],
};

// What is fetched again when the connection opens again: what may have changed while it was closed.
const SHOWN: readonly QueryKey[] = [
  FRIENDS_KEY,
  POSITIONS_KEY,
  QUESTS_KEY,
  MY_PARTY_KEY,
  PARTIES_KEY,
  GLOBAL_EVENTS_KEY,
];

function refetch(queryClient: QueryClient, keys: readonly QueryKey[]): void {
  for (const queryKey of keys) {
    void queryClient.invalidateQueries({ queryKey });
  }
}

// A position replaces the User's one before, which the Avatar glides from.
export function withPosition(positions: readonly Position[], position: Position): Position[] {
  return [...positions.filter(({ userId }) => userId !== position.userId), position];
}

// A position that arrives for a Friend or a member whom the answers say the User cannot see means that those answers
// are old: the Friend turned sharing on, say. They are fetched again, so that the Avatar appears.
function refetchIfUnseen(queryClient: QueryClient, userId: string): void {
  const friend = queryClient.getQueryData<Friend[]>(FRIENDS_KEY)?.find(({ id }) => id === userId);
  if (friend !== undefined && !friend.visible) {
    refetch(queryClient, [FRIENDS_KEY]);
  }
  const member = queryClient.getQueryData<MyParty | null>(MY_PARTY_KEY)?.members.find(({ id }) => id === userId);
  if (member !== undefined && !member.visible) {
    refetch(queryClient, [MY_PARTY_KEY]);
  }
}

function openFor(queryClient: QueryClient): () => void {
  return openLiveConnection(socketServerUrl(), {
    accessToken: () => heldTokens()?.accessToken ?? null,
    renew: renewSession,
    onConnect: (again) => {
      refetch(queryClient, again ? SHOWN : [POSITIONS_KEY]);
    },
    onSessionEnded: (replaced) => {
      void endSession(replaced);
    },
    onPosition: (position) => {
      // Before the first answer there is nothing to add to: the answer brings the position.
      queryClient.setQueryData<Position[]>(POSITIONS_KEY, (positions) =>
        positions === undefined ? undefined : withPosition(positions, position),
      );
      refetchIfUnseen(queryClient, position.userId);
    },
    onPositionRemoved: (userId) => {
      queryClient.setQueryData<Position[]>(POSITIONS_KEY, (positions) =>
        positions?.filter((position) => position.userId !== userId),
      );
    },
    onSignal: (name) => {
      refetch(queryClient, REFETCH[name] ?? []);
    },
  });
}

// Keeps the one connection to the socket server open while a signed-in User is past the sign-in and Onboarding, in a
// build that asks the main server. When the app comes back to the front, the positions are fetched again, and the
// Quests, whose rows word their times against the phone's clock. Draws nothing.
export function LiveUpdates(): null {
  const queryClient = useQueryClient();
  const { status } = useSession();
  const live = status === 'ready' && asksMainServer() && socketServerUrl() !== '';
  useEffect((): (() => void) | void => {
    if (!live) {
      return;
    }
    const close = openFor(queryClient);
    const watch = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetch(queryClient, [POSITIONS_KEY, QUESTS_KEY]);
      }
    });
    return () => {
      watch.remove();
      close();
    };
  }, [live, queryClient]);
  return null;
}
