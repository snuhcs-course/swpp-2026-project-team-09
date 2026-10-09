// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  myJoinRequestsQuery,
  myPartyQuery,
  partiesQuery,
  questInvitationsQuery,
  questsQuery,
  recruitingQuery,
} from '@/api/queries';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Board } from '@/api/types';
import type { QuestInvitation } from '@/api/waiting-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { useMeetupInvites } from '@/features/meetups/use-meetups';
import { sameKoreaDay } from '@/korea-time';
import { BOARDS } from './boards';
import { type MineCardView, toMineCards } from './mine';
import { boardPosts, entryPost, type PostView, questPost } from './posts';

interface Asked<Data> {
  data: Data | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

// Combines the answers a view needs: shown once all have answered.
function combined<View>(asked: readonly Asked<unknown>[], view: () => View): ScreenData<View> {
  const isPending = somePending(asked);
  const isError = someFailed(asked);
  return { data: isPending || isError ? undefined : view(), isPending, isError, refetch: askAgain(asked) };
}

// 찾기's 모집 중인 파티: the recruiting Quests, the newest first as the list holds them.
export function useRecruitingPosts(): ScreenData<PostView[]> {
  const [entries, requests] = useQueries({ queries: [recruitingQuery('all'), myJoinRequestsQuery] });
  return combined([entries, requests], () =>
    (entries.data ?? []).map((entry) => entryPost(entry, requests.data ?? [])),
  );
}

export interface BoardRowView {
  board: Board;
  name: string;
  count: number;
  // A post was made today.
  fresh: boolean;
}

// 전체 파티's boards, with their posts counted from the list of all recruiting Quests and the User's own.
export function useBoardRows(): ScreenData<BoardRowView[]> {
  const [entries, quests] = useQueries({ queries: [recruitingQuery('all'), questsQuery] });
  return combined([entries, quests], () =>
    BOARDS.map(({ key, name }) => {
      const posts = boardPosts(key, entries.data ?? [], quests.data ?? [], [], myUserId());
      return {
        board: key,
        name: `${name} 게시판`,
        count: posts.length,
        fresh: posts.some(({ createdAt }) => sameKoreaDay(new Date(createdAt), now())),
      };
    }),
  );
}

export function useBoardPosts(board: Board): ScreenData<PostView[]> {
  const [entries, quests, requests] = useQueries({
    queries: [recruitingQuery(board), questsQuery, myJoinRequestsQuery],
  });
  return combined([entries, quests, requests], () =>
    boardPosts(board, entries.data ?? [], quests.data ?? [], requests.data ?? [], myUserId()),
  );
}

// 파티 모집글: a Quest the User holds, or a recruiting one. Null when neither list holds it.
export function usePost(questId: string): ScreenData<PostView | null> {
  const [quests, entries, requests] = useQueries({
    queries: [questsQuery, recruitingQuery('all'), myJoinRequestsQuery],
  });
  return combined([quests, entries, requests], () => {
    const held = quests.data?.find(({ id }) => id === questId);
    if (held !== undefined) {
      return questPost(held, myUserId());
    }
    const entry = entries.data?.find(({ id }) => id === questId);
    return entry === undefined ? null : entryPost(entry, requests.data ?? []);
  });
}

export function useMineCards(): ScreenData<MineCardView[]> {
  const [quests, myParty, parties] = useQueries({ queries: [questsQuery, myPartyQuery, partiesQuery] });
  return combined([quests, myParty, parties], () =>
    toMineCards({
      quests: quests.data ?? [],
      myParty: myParty.data ?? null,
      parties: parties.data ?? [],
      meId: myUserId(),
      now: now(),
    }),
  );
}

export function useInvitations(): ScreenData<QuestInvitation[]> {
  const invitations = useQuery(questInvitationsQuery);
  return combined([invitations], () => invitations.data ?? []);
}

// The tabs' counts: the User's Quests but the Class Quests, and what waits under 초대, the Quest invitations and the
// Meetups proposed to the User. 0 while they load.
export function usePartyCounts(): { mine: number; invites: number } {
  const quests = useQuery(questsQuery);
  const invitations = useQuery(questInvitationsQuery);
  const meetups = useMeetupInvites();
  return {
    mine: (quests.data ?? []).filter(({ classQuest }) => !classQuest).length,
    invites: (invitations.data?.length ?? 0) + (meetups.data?.received.length ?? 0),
  };
}
