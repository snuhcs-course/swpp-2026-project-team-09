/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MemberFace, QuestPhoto, ShownQuest, ShownRecruitingQuest } from '@/api/quest-parts-types';
import type { Board, JoinPolicy, Person, SubQuest } from '@/api/types';
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

// A Friend of the User, as the posts know them.
export type KnownFriend = Pick<Person, 'id' | 'name'>;

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
  // When the next Sub Quest starts, or null.
  startsAt: string | null;
  // "오늘 19:30", or "시간 미정".
  time: string;
  // "버들골 (100동) 입구", or "장소 미정".
  place: string;
  // "최유나 외 2명 · 친구 1명 포함", "최유나 외 2명", or "최유나".
  members: string;
  createdAt: string;
  role: PostRole;
  // The mocked parts (`@/api/quest-parts/`): the photo, the tags without '#', and up to three members' faces.
  photo: QuestPhoto | null;
  tags: string[];
  faces: MemberFace[];
  // The names of the User's Friends among the members, the Leader first.
  friends: string[];
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

function membersOf(leader: string, holders: number, friends: number): string {
  const members = holders > 1 ? `${leader} 외 ${String(holders - 1)}명` : leader;
  return friends > 0 ? `${members} · 친구 ${String(friends)}명 포함` : members;
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
  photo: QuestPhoto | null;
  tags: string[];
  faces: MemberFace[];
  friends: string[];
}

function postOf({ next, ...head }: Head): PostView {
  return {
    ...head,
    fill: `${String(head.holders)}/${String(head.capacity)}명`,
    startsAt: next?.startsAt ?? null,
    time: timeOf(next),
    place: next?.place?.label ?? '장소 미정',
    members: membersOf(head.leader.name, head.holders, head.friends.length),
  };
}

// The Friends among a summary's members: its Leader by id, and the others its faces name, which only the mock build
// adds.
function friendsOfSummary({ leader, faces }: ShownRecruitingQuest, friends: readonly KnownFriend[]): string[] {
  const ids = new Set(friends.map(({ id }) => id));
  const names = new Set(friends.map(({ name }) => name));
  const others = faces.slice(1).filter(({ name }) => names.has(name) && name !== leader.name);
  return [...(ids.has(leader.id) ? [leader.name] : []), ...others.map(({ name }) => name)];
}

export function entryPost(
  entry: ShownRecruitingQuest,
  requests: readonly MyJoinRequest[],
  friends: readonly KnownFriend[] = [],
): PostView {
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
    photo: entry.photo,
    tags: entry.tags,
    faces: entry.faces,
    friends: friendsOfSummary(entry, friends),
  });
}

// One of the User's Quests. A Class Quest has no post.
export function questPost(quest: ShownQuest, meId: string, friends: readonly KnownFriend[] = []): PostView | null {
  const { leader, createdAt } = quest;
  if (leader === null || createdAt === null) {
    return null;
  }
  const ids = new Set(friends.map(({ id }) => id));
  const holders = [leader, ...quest.holders.filter(({ id }) => id !== leader.id)];
  return postOf({
    questId: quest.id,
    title: quest.title,
    description: quest.description,
    leader,
    event: quest.globalEvent?.title ?? null,
    board: quest.board,
    joinPolicy: quest.joinPolicy,
    holders: quest.holders.length,
    capacity: quest.capacity,
    createdAt,
    next: shownSubQuest(quest),
    role: leader.id === meId ? { kind: 'leader' } : { kind: 'holder' },
    photo: quest.photo,
    tags: quest.tags,
    faces: quest.faces,
    friends: holders.filter(({ id }) => ids.has(id)).map(({ name }) => name),
  });
}

function newestFirst(one: PostView, other: PostView): number {
  return other.createdAt.localeCompare(one.createdAt);
}

// A board's posts: the recruiting Quests of others, and the User's own Open or Approval Quests on it with a Sub
// Quest ahead, which the recruiting list leaves out. The newest first.
export function boardPosts(
  board: Board,
  entries: readonly ShownRecruitingQuest[],
  quests: readonly ShownQuest[],
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
