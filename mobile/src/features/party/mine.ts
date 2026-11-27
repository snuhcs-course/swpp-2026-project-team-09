/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { MyParty, Party, Quest } from '@/api/types';
import { koreaClock, koreaDaysAfter, koreaWeekday } from '@/korea-time';
import { heldAlone, shownSubQuest, waitWords } from '@/features/quests/adapter';
import { requestFlagOf, requestLine } from '@/features/quests/room-request-flag';
import { boardName } from './boards';
import { whenOf } from './posts';

// 내 파티, the frame's `PartyMine`: the User's Quests but the Class Quests, and the past ones, as cards in groups.

export type MineFilter = 'all' | 'private' | 'public';

// A Party that runs on the Quest without the User: waiting until the User answers its 활성화 알림 (`거절`, `참여`),
// `declined` once the User declined it on this phone (`참여` alone). `words` is "활성화 중 · 김민준", the one who
// turned it on, or "활성화 중 · 참여 안 함".
export interface MineStripView {
  partyId: string;
  title: string;
  words: string;
  declined: boolean;
}

export interface MineCardView {
  questId: string;
  title: string;
  private: boolean;
  // The top's tag: a 공개 파티's board, "취미 게시판", or "비공개"; null for a public Quest without a board.
  tag: string | null;
  // The User leads the Quest: a crown before the count.
  leads: boolean;
  // "3/8명" on a Quest the User leads that recruits, "N명" otherwise.
  count: string;
  // The next Sub Quest's time, "17:40 · 23분 후", "내일 19:00" or "시간 미정", and its place, or "장소 미정".
  time: string;
  place: string;
  // The Global Event the Quest is for, or null.
  event: string | null;
  // The User is in the Quest's Party.
  live: boolean;
  strip: MineStripView | null;
  group: string;
  start: number;
  // The requests to join waiting for the User's answer, on a Quest the User leads.
  waiting: number;
  // A past Quest, which has no room to open.
  past: boolean;
  // A booking party whose room request of studying together is out: a press opens that answer again, not the room
  // (P10 ticket 13), and its time line says the request: "내일 15:00 · 동의 1/3 · 기다리는 중".
  reopens?: true;
}

export interface MineGroup {
  title: string;
  cards: MineCardView[];
}

const PAST = '지난 일정';
// The group of the Party the User is in now, which the 내 파티 list marks with the red light.
export const LIVE_GROUP = '활성화 중';
const GROUPS = [
  LIVE_GROUP,
  '활성화 알림',
  '다른 활성 파티',
  '오늘',
  '내일',
  '이번 주',
  '다음 주',
  '그 이후',
  '시간 미정',
  PAST,
] as const;
const MINUTE_MS = 60_000;

// By the days to the start in Korea's time: this week runs to Sunday, the next week to the Sunday after. A Quest the
// User holds now is still going even when its step started before today, so it stays under `오늘`; only the past
// Quests of `listPastQuests` go under `지난 일정`.
function dayGroup(start: string | null, now: Date): string {
  if (start === null) {
    return '시간 미정';
  }
  const days = koreaDaysAfter(now, new Date(start));
  const toSunday = (7 - koreaWeekday(now)) % 7;
  if (days <= 0) {
    return '오늘';
  }
  if (days === 1) {
    return '내일';
  }
  if (days <= toSunday) {
    return '이번 주';
  }
  return days <= toSunday + 7 ? '다음 주' : '그 이후';
}

function whenWords(start: string, now: Date): string {
  const minutes = Math.ceil((new Date(start).getTime() - now.getTime()) / MINUTE_MS);
  if (koreaDaysAfter(now, new Date(start)) === 0 && minutes > 0) {
    return `${koreaClock(start)} · ${waitWords(minutes)}`;
  }
  return whenOf(start);
}

export interface MineSources {
  quests: readonly Quest[];
  myParty: MyParty | null;
  parties: readonly Party[];
  // The Parties whose 활성화 the User declined on this phone.
  declined: readonly string[];
  // The User's past Quests.
  past: readonly Quest[];
  meId: string;
  now: Date;
}

// How full a Quest the User leads and recruits for is, "3/8명"; its Holders, "N명", otherwise. The invitations the
// User sent are not counted: the 파티 shows them inside.
function countOf(quest: Quest, meId: string): string {
  const holders = quest.holders.length;
  return quest.leader?.id === meId && quest.joinPolicy !== 'closed'
    ? `${String(holders)}/${String(quest.capacity)}명`
    : `${String(holders)}명`;
}

function stripOf(running: Party | undefined, declined: readonly string[]): MineStripView | null {
  if (running === undefined) {
    return null;
  }
  const { id, title, leader } = running;
  if (declined.includes(id)) {
    return { partyId: id, title, words: '활성화 중 · 참여 안 함', declined: true };
  }
  return {
    partyId: id,
    title,
    words: leader === undefined ? '활성화 중' : `활성화 중 · ${leader.name}`,
    declined: false,
  };
}

// The running Parties first: the User's, those that wait for an answer, then the declined ones.
function groupOf(live: boolean, strip: MineStripView | null, start: string | null, now: Date): string {
  if (live) {
    return LIVE_GROUP;
  }
  if (strip !== null) {
    return strip.declined ? '다른 활성 파티' : '활성화 알림';
  }
  return dayGroup(start, now);
}

function placeOf(label: string): string {
  return label === '' ? '장소 미정' : label;
}

function tagOf({ joinPolicy, board }: Quest): string | null {
  if (joinPolicy === 'closed') {
    return '비공개';
  }
  return board === null ? null : boardName(board);
}

function cardOf(quest: Quest, sources: MineSources, past: boolean): MineCardView {
  const { myParty, parties, declined, meId, now } = sources;
  // A past Quest's Sub Quests have all ended: its first tells when it was.
  const next = past ? (quest.subQuests[0] ?? null) : shownSubQuest(quest);
  const start = next?.startsAt ?? null;
  const live = !past && myParty?.quest?.id === quest.id;
  const strip =
    live || past
      ? null
      : stripOf(
          parties.find((party) => party.quest?.id === quest.id),
          declined,
        );
  const request = past ? null : requestFlagOf(quest, start, now);
  return {
    questId: quest.id,
    title: quest.title,
    private: quest.joinPolicy === 'closed',
    tag: tagOf(quest),
    leads: quest.leader?.id === meId,
    count: countOf(quest, meId),
    time: request === null ? (start === null ? '시간 미정' : whenWords(start, now)) : requestLine(request),
    place: placeOf(next?.place?.label ?? ''),
    event: quest.globalEvent?.title ?? null,
    ...(request === null ? {} : { reopens: true }),
    live,
    strip,
    group: past ? PAST : groupOf(live, strip, start, now),
    start: start === null ? Number.POSITIVE_INFINITY : new Date(start).getTime(),
    waiting: past ? 0 : quest.waitingJoinRequests,
    past,
  };
}

// A Quest held alone is no 파티.
function withoutAlone(quests: readonly Quest[]): Quest[] {
  return quests.filter((quest) => !heldAlone(quest));
}

// The User's Quests but the Class Quests, then the past ones.
export function toMineCards(sources: MineSources): MineCardView[] {
  return [
    ...withoutAlone(sources.quests.filter(({ classQuest }) => !classQuest)).map((quest) =>
      cardOf(quest, sources, false),
    ),
    ...withoutAlone(sources.past).map((quest) => cardOf(quest, sources, true)),
  ];
}

export function filterMine(cards: readonly MineCardView[], filter: MineFilter): MineCardView[] {
  return cards.filter((card) => filter === 'all' || card.private === (filter === 'private'));
}

// In the frame's order of groups, `지난 일정` last: each by the next Sub Quest's start, the past ones the latest first.
export function groupMine(cards: readonly MineCardView[]): MineGroup[] {
  return GROUPS.map((title) => ({
    title,
    cards: cards
      .filter(({ group }) => group === title)
      .toSorted((one, other) => (title === PAST ? other.start - one.start : one.start - other.start)),
  })).filter(({ cards: shown }) => shown.length > 0);
}
