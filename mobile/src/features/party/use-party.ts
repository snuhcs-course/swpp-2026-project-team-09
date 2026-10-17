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
  classesQuery,
  companionSeekersQuery,
  friendsQuery,
  hiddenPostsQuery,
  myJoinRequestsQuery,
  myPartyQuery,
  myTagsQuery,
  officialRecruitingQuery,
  partiesQuery,
  questInvitationsQuery,
  questsQuery,
  recruitingQuery,
} from '@/api/queries';
import type { CompanionSeeker, OfficialRecruiting } from '@/api/quest-parts-types';
import { type ScreenData, askAgain, someFailed, somePending } from '@/api/screen-data';
import type { Board } from '@/api/types';
import type { QuestInvitation } from '@/api/waiting-types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { sameKoreaDay } from '@/korea-time';
import { BOARDS } from './boards';
import { findPosts, type Reasons, reasonsFor } from './finding';
import { type MineCardView, toMineCards } from './mine';
import { boardPosts, entryPost, type PostView, questPost } from './posts';

interface Asked<Data> {
  data: Data | undefined;
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

// Combines the answers a view needs: shown once all have answered. An answer that only adds to the view, such as the
// Friends a post counts or the User's tags it is ordered by, is waited for too, but the view is shown without it when
// it fails.
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

export interface FindView {
  posts: PostView[];
  // How many posts the User hid with `관심 없음`.
  hidden: number;
}

// 찾기's 모집 중인 파티: the recruiting Quests that match the search and that the User did not hide, those sharing more
// tags with the User first, and otherwise the newest first as the list holds them.
export function useFindPosts(search: string): ScreenData<FindView> {
  const [entries, requests, friends, myTags, hidden] = useQueries({
    queries: [recruitingQuery('all'), myJoinRequestsQuery, friendsQuery, myTagsQuery, hiddenPostsQuery],
  });
  return combined(
    [entries, requests],
    () => {
      const posts = (entries.data ?? []).map((entry) => entryPost(entry, requests.data ?? [], friends.data ?? []));
      const hiddenIds = hidden.data ?? [];
      return {
        posts: findPosts(posts, { search, myTags: myTags.data ?? [], hidden: hiddenIds }),
        hidden: hiddenIds.length,
      };
    },
    [friends, myTags, hidden],
  );
}

// Official recruiting, for 찾기's banner and 전체 파티's `공식`. None in the build that asks the main server.
export function useOfficialRecruiting(): ScreenData<OfficialRecruiting[]> {
  const official = useQuery(officialRecruitingQuery);
  return combined([official], () => official.data ?? []);
}

// 같이 할 사람을 찾는 중. None in the build that asks the main server.
export function useCompanionSeekers(): ScreenData<CompanionSeeker[]> {
  const seekers = useQuery(companionSeekersQuery);
  return combined([seekers], () => seekers.data ?? []);
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

export interface PostDetailView {
  post: PostView;
  // 추천 이유, for a post the User may join; null for one they hold.
  reasons: Reasons | null;
}

// 파티 모집글: a Quest the User holds, or a recruiting one, with the reasons it is recommended. Null when neither list
// holds it.
export function usePost(questId: string): ScreenData<PostDetailView | null> {
  const [quests, entries, requests, friends, myTags, classes] = useQueries({
    queries: [questsQuery, recruitingQuery('all'), myJoinRequestsQuery, friendsQuery, myTagsQuery, classesQuery],
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
        post = entryPost(entry, requests.data ?? [], friends.data ?? []);
      }
      if (post === null) {
        return null;
      }
      const mayJoin = post.role.kind === 'open' || post.role.kind === 'approval';
      const reasons = mayJoin
        ? reasonsFor(post, { myTags: myTags.data ?? [], classes: classes.data ?? null, today: now() })
        : null;
      return { post, reasons };
    },
    [friends, myTags, classes],
  );
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
