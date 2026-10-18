/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQueries, useQuery } from '@tanstack/react-query';
import {
  lobbyQuery,
  myJoinRequestsQuery,
  myPartyQuery,
  partiesQuery,
  pastQuestsQuery,
  questInvitationsQuery,
  questsQuery,
  recruitingQuery,
  sentInvitationsQuery,
} from '@/api/queries';
import type { ShownQuestInvitation } from '@/api/quest-parts-types';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Board, Quest } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { declinedPartiesQuery } from '@/features/parties/declined';
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

// The invitations still waiting, by the id of each Quest the User leads. A list not yet answered, or refused, counts
// none: the cards do not wait for it.
function useInvited(quests: readonly Quest[] | undefined, meId: string): Partial<Record<string, number>> {
  const led = (quests ?? []).filter(({ leader, classQuest }) => !classQuest && leader?.id === meId);
  const sent = useQueries({ queries: led.map(({ id }) => sentInvitationsQuery(id)) });
  return Object.fromEntries(led.map(({ id }, index) => [id, sent[index]?.data?.length ?? 0]));
}

// The User's past Quests, once the Lobby names the User. Shown when they come: the cards do not wait for them.
function usePastQuests(meId: string): readonly Quest[] {
  const profile = useQuery(lobbyQuery).data?.profile;
  const me = { id: meId, name: profile?.name ?? '', department: profile?.department ?? '' };
  return useQuery({ ...pastQuestsQuery(me), enabled: profile !== undefined }).data ?? [];
}

// 내 파티: the User's Quests, with the running Parties, the ones declined on this phone, the invitations waiting on
// the Quests the User leads, and the past Quests.
export function useMineCards(): ScreenData<MineCardView[]> {
  const meId = myUserId();
  const [quests, myParty, parties, declined] = useQueries({
    queries: [questsQuery, myPartyQuery, partiesQuery, declinedPartiesQuery],
  });
  const invited = useInvited(quests.data, meId);
  const past = usePastQuests(meId);
  return combined([quests, myParty, parties, declined], () =>
    toMineCards({
      quests: quests.data ?? [],
      myParty: myParty.data ?? null,
      parties: parties.data ?? [],
      declined: declined.data ?? [],
      invited,
      past,
      meId,
      now: now(),
    }),
  );
}

export function useInvitations(): ScreenData<ShownQuestInvitation[]> {
  const invitations = useQuery(questInvitationsQuery);
  return combined([invitations], () => invitations.data ?? []);
}

// The tabs' counts: the User's Quests but the Class Quests, and what waits under 초대, the Quest invitations. 0 while
// they load.
export function usePartyCounts(): { mine: number; invites: number } {
  const quests = useQuery(questsQuery);
  const invitations = useQuery(questInvitationsQuery);
  return {
    mine: (quests.data ?? []).filter(({ classQuest }) => !classQuest).length,
    invites: invitations.data?.length ?? 0,
  };
}
