/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useQueries, useQuery } from '@tanstack/react-query';
import {
  lobbyQuery,
  classesQuery,
  companionSeekersQuery,
  friendsQuery,
  hiddenPostsQuery,
  myJoinRequestsQuery,
  myPartyQuery,
  officialRecruitingQuery,
  partiesQuery,
  pastQuestsQuery,
  questInvitationsQuery,
  questRemovalsQuery,
  questsQuery,
  recruitingQuery,
} from '@/api/queries';
import type { CompanionSeeker, OfficialRecruiting, ShownQuestInvitation } from '@/api/quest-parts-types';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Quest } from '@/api/types';
import type { MyJoinRequest } from '@/api/waiting-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { declinedPartiesQuery } from '@/features/parties/declined';
import { heldAlone } from '@/features/quests/adapter';
import { findPosts, type Reasons, reasonsFor } from './finding';
import { type MineCardView, toMineCards } from './mine';
import { entryPost, hasRoom, type PostView, questPost } from './posts';

interface Asked<Data> {
  data: Data | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

// Combines the answers a view needs: shown once all have answered. An answer that only adds to the view, such as the
// Friends a post counts or the posts the User hid, is waited for too, but the view is shown without it when it fails.
function combined<View>(
  asked: readonly Asked<unknown>[],
  view: () => View,
  adding: readonly Asked<unknown>[] = [],
): ScreenData<View> {
  const isPending = somePending([...asked, ...adding]);
  const isError = someFailed(asked);
  return {
    data: isPending || isError ? undefined : view(),
    isPending,
    isError,
    refetch: askAgain([...asked, ...adding]),
  };
}

// 찾기's posts: the recruiting Quests with a place left that match the search and that the User did not hide, the
// newest first as the list holds them.
export function useFindPosts(search: string): ScreenData<PostView[]> {
  const [entries, requests, friends, hidden, removals] = useQueries({
    queries: [recruitingQuery('all'), myJoinRequestsQuery, friendsQuery, hiddenPostsQuery, questRemovalsQuery],
  });
  return combined(
    [entries, requests],
    () => {
      const posts = (entries.data ?? [])
        .map((entry) => entryPost(entry, requests.data ?? [], friends.data ?? [], removals.data ?? []))
        .filter((post) => hasRoom(post));
      return findPosts(posts, { search, hidden: hidden.data ?? [] });
    },
    [friends, hidden, removals],
  );
}

// Official recruiting, for 찾기's banner. None in the build that asks the main server.
export function useOfficialRecruiting(): ScreenData<OfficialRecruiting[]> {
  const official = useQuery(officialRecruitingQuery);
  return combined([official], () => official.data ?? []);
}

// 같이 할 사람을 찾는 중. None in the build that asks the main server.
export function useCompanionSeekers(): ScreenData<CompanionSeeker[]> {
  const seekers = useQuery(companionSeekersQuery);
  return combined([seekers], () => seekers.data ?? []);
}

export interface PostDetailView {
  post: PostView;
  // 추천 이유, for a post the User may join; null for one they hold.
  reasons: Reasons | null;
}

// 파티 모집글: a Quest the User holds, or a recruiting one, with the reasons it is recommended. Null when neither list
// holds it.
export function usePost(questId: string): ScreenData<PostDetailView | null> {
  const [quests, entries, requests, friends, classes, removals] = useQueries({
    queries: [questsQuery, recruitingQuery('all'), myJoinRequestsQuery, friendsQuery, classesQuery, questRemovalsQuery],
  });
  return combined(
    [quests, entries, requests],
    () => {
      const held = quests.data?.find(({ id }) => id === questId);
      const entry = entries.data?.find(({ id }) => id === questId);
      let post: PostView | null = null;
      if (held !== undefined) {
        post = questPost(held, myUserId(), friends.data ?? []);
      } else if (entry !== undefined) {
        post = entryPost(entry, requests.data ?? [], friends.data ?? [], removals.data ?? []);
      }
      if (post === null) {
        return null;
      }
      const mayJoin = post.role.kind === 'open' || post.role.kind === 'approval';
      const reasons = mayJoin ? reasonsFor(post, { classes: classes.data ?? null, today: now() }) : null;
      return { post, reasons };
    },
    [friends, classes, removals],
  );
}

// The User's past Quests, once the Lobby names the User. Shown when they come: the cards do not wait for them.
function usePastQuests(meId: string): readonly Quest[] {
  const profile = useQuery(lobbyQuery).data?.profile;
  const me = { id: meId, name: profile?.name ?? '', department: profile?.department ?? '' };
  return useQuery({ ...pastQuestsQuery(me), enabled: profile !== undefined }).data ?? [];
}

// 내 파티: the User's Quests, with the running Parties, the ones declined on this phone, and the past Quests.
export function useMineCards(): ScreenData<MineCardView[]> {
  const meId = myUserId();
  const [quests, myParty, parties, declined] = useQueries({
    queries: [questsQuery, myPartyQuery, partiesQuery, declinedPartiesQuery],
  });
  const past = usePastQuests(meId);
  return combined([quests, myParty, parties, declined], () =>
    toMineCards({
      quests: quests.data ?? [],
      myParty: myParty.data ?? null,
      parties: parties.data ?? [],
      declined: declined.data ?? [],
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

// 보낸 신청: the User's waiting requests to join, the newest first, wherever they were sent, a chat card included.
export function useSentRequests(): ScreenData<MyJoinRequest[]> {
  const requests = useQuery(myJoinRequestsQuery);
  return combined([requests], () => requests.data ?? []);
}

// The tabs' counts: the User's Quests but the Class Quests and those taken alone, and what waits under 초대, the Quest invitations. 0 while
// they load.
export function usePartyCounts(): { mine: number; invites: number } {
  const quests = useQuery(questsQuery);
  const invitations = useQuery(questInvitationsQuery);
  return {
    mine: (quests.data ?? []).filter((quest) => !quest.classQuest && !heldAlone(quest)).length,
    invites: invitations.data?.length ?? 0,
  };
}
