/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RecruitingQuest } from '@/api/party-types';
import type { Board, JoinPolicy, Person, Quest, SubQuest } from '@/api/types';
import type { MyJoinRequest } from '@/api/waiting-types';
import { now } from '@/clock';
import { koreaClock, koreaDay, koreaShortDate, sameKoreaDay } from '@/korea-time';
import { shownSubQuest } from '@/features/quests/adapter';

// A recruiting post, as 찾기's cards, a board and 파티 모집글 show it: another's recruiting Quest, or one of the
// User's own Quests.

// How the post reads to the User: its Leader, another Holder, or one who may join an Open Quest or ask to join an
// Approval one, with the request that waits.
export type PostRole =
  { kind: 'leader' } | { kind: 'holder' } | { kind: 'open' } | { kind: 'approval'; requestId: string | null };

export interface PostView {
  questId: string;
  title: string;
  description: string;
  leader: Person;
  event: string | null;
  board: Board | null;
  joinPolicy: JoinPolicy;
  // "3/8명"
  fill: string;
  holders: number;
  capacity: number;
  // "오늘 19:30", or "시간 미정".
  time: string;
  // "버들골 (100동) 입구", or "장소 미정".
  place: string;
  // "최유나 외 2명", or "최유나".
  members: string;
  createdAt: string;
  role: PostRole;
}

type Next = Pick<SubQuest, 'startsAt' | 'place'> | null;

// "오늘 19:30", "내일 19:30", "10월 8일 (목) 19:00".
export function whenOf(instant: string): string {
  return `${koreaDay(instant, now())} ${koreaClock(instant)}`;
}

function timeOf(next: Next): string {
  const start = next?.startsAt ?? null;
  return start === null ? '시간 미정' : whenOf(start);
}

function membersOf(leader: string, holders: number): string {
  return holders > 1 ? `${leader} 외 ${holders - 1}명` : leader;
}

interface Head {
  questId: string;
  title: string;
  description: string;
  leader: Person;
  event: string | null;
  board: Board | null;
  joinPolicy: JoinPolicy;
  holders: number;
  capacity: number;
  createdAt: string;
  next: Next;
  role: PostRole;
}

function postOf({ next, ...head }: Head): PostView {
  return {
    ...head,
    fill: `${head.holders}/${head.capacity}명`,
    time: timeOf(next),
    place: next?.place?.label ?? '장소 미정',
    members: membersOf(head.leader.name, head.holders),
  };
}

export function entryPost(entry: RecruitingQuest, requests: readonly MyJoinRequest[]): PostView {
  const waiting = requests.find(({ quest }) => quest.id === entry.id);
  return postOf({
    questId: entry.id,
    title: entry.title,
    description: entry.description,
    leader: entry.leader,
    event: entry.globalEvent?.title ?? null,
    board: entry.board,
    joinPolicy: entry.joinPolicy,
    holders: entry.holderCount,
    capacity: entry.capacity,
    createdAt: entry.createdAt,
    next: entry.nextSubQuest,
    role: entry.joinPolicy === 'approval' ? { kind: 'approval', requestId: waiting?.id ?? null } : { kind: 'open' },
  });
}

// One of the User's Quests. A Class Quest has no post.
export function questPost(quest: Quest, meId: string): PostView | null {
  if (quest.leader === null || quest.createdAt === null) {
    return null;
  }
  return postOf({
    questId: quest.id,
    title: quest.title,
    description: quest.description,
    leader: quest.leader,
    event: quest.globalEvent?.title ?? null,
    board: quest.board,
    joinPolicy: quest.joinPolicy,
    holders: quest.holders.length,
    capacity: quest.capacity,
    createdAt: quest.createdAt,
    next: shownSubQuest(quest),
    role: quest.leader.id === meId ? { kind: 'leader' } : { kind: 'holder' },
  });
}

function newestFirst(one: PostView, other: PostView): number {
  return other.createdAt.localeCompare(one.createdAt);
}

// A board's posts: the recruiting Quests of others, and the User's own Open or Approval Quests on it with a Sub
// Quest ahead, which the recruiting list leaves out. The newest first.
export function boardPosts(
  board: Board,
  entries: readonly RecruitingQuest[],
  quests: readonly Quest[],
  requests: readonly MyJoinRequest[],
  meId: string,
): PostView[] {
  const own = quests
    .filter((quest) => quest.board === board && quest.joinPolicy !== 'closed' && shownSubQuest(quest) !== null)
    .flatMap((quest) => questPost(quest, meId) ?? []);
  const others = entries.filter((entry) => entry.board === board).map((entry) => entryPost(entry, requests));
  return [...own, ...others].toSorted(newestFirst);
}

// When a post was made: "13:21" today, "10/03 (토) 15:57" before.
export function postedWords(createdAt: string, today: Date): string {
  const instant = new Date(createdAt);
  const clock = koreaClock(createdAt);
  return sameKoreaDay(instant, today) ? clock : `${koreaShortDate(instant)} ${clock}`;
}
