/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { MyParty, Party, Quest } from '@/api/types';
import { koreaClock, koreaDaysAfter, koreaWeekday } from '@/korea-time';
import { shownSubQuest, waitWords } from '@/features/quests/adapter';
import { whenOf } from './posts';

// 내 파티, the frame's `PartyMine`: the User's Quests but the Class Quests, and the past ones, as cards in groups.

export type MineFilter = 'all' | 'private' | 'public';

// A Party that runs on the Quest without the User: waiting until the User answers its 활성화 알림 (`거절`, `참여`),
// `declined` once the User declined it on this phone (`참여` alone).
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
  badge: { label: string; live: boolean };
  event: string | null;
  // The next Sub Quest: "17:40 · 23분 후" or "내일 19:00", and its title and place.
  next: { when: string; what: string } | null;
  // The Holders' names, the User first.
  faces: string[];
  // "나, 정하은 외 2명"
  people: string;
  // The User is in the Quest's Party.
  live: boolean;
  strip: MineStripView | null;
  group: string;
  start: number;
  // The requests to join waiting for the User's answer, on a Quest the User leads.
  waiting: number;
  // A past Quest, which has no room to open.
  past: boolean;
}

export interface MineGroup {
  title: string;
  cards: MineCardView[];
}

const PAST = '지난 일정';
const GROUPS = [
  '활성화 중',
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

// By the days to the start in Korea's time: this week runs to Sunday, the next week to the Sunday after.
function dayGroup(start: string | null, now: Date): string {
  if (start === null) {
    return '시간 미정';
  }
  const days = koreaDaysAfter(now, new Date(start));
  const toSunday = (7 - koreaWeekday(now)) % 7;
  if (days < 0) {
    return PAST;
  }
  if (days === 0) {
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

function peopleOf(others: readonly string[]): string {
  const [first] = others;
  if (first === undefined) {
    return '나';
  }
  return others.length > 1 ? `나, ${first} 외 ${others.length - 1}명` : `나, ${first}`;
}

export interface MineSources {
  quests: readonly Quest[];
  myParty: MyParty | null;
  parties: readonly Party[];
  // The Parties whose 활성화 the User declined on this phone.
  declined: readonly string[];
  // The invitations still waiting for an answer, by the id of a Quest the User leads.
  invited: Readonly<Partial<Record<string, number>>>;
  // The User's past Quests.
  past: readonly Quest[];
  meId: string;
  now: Date;
}

// While the User is in its Party: how many share their location, or `응답 대기` while only the User does. Otherwise,
// on a Quest the User leads, how full it is and the invitations waiting; on another's, its members.
function badgeOf(quest: Quest, live: boolean, { myParty, invited, meId }: MineSources): MineCardView['badge'] {
  if (live && myParty !== null) {
    const sharing = myParty.members.filter(({ id, visible }) => id !== meId && visible).length + 1;
    return { label: sharing > 1 ? `활성화 중 · ${sharing}명 위치 공유` : '활성화 중 · 응답 대기', live: true };
  }
  const holders = quest.holders.length;
  if (quest.leader?.id !== meId) {
    return { label: `멤버 ${holders}명`, live: false };
  }
  const fill = quest.joinPolicy === 'closed' ? `${holders}명` : `모집 중 · ${holders}/${quest.capacity}명`;
  const waiting = invited[quest.id] ?? 0;
  return { label: waiting > 0 ? `${fill} · 초대 ${waiting}명 대기` : fill, live: false };
}

function stripOf(running: Party | undefined, declined: readonly string[]): MineStripView | null {
  if (running === undefined) {
    return null;
  }
  const { id, title, leader } = running;
  if (declined.includes(id)) {
    return { partyId: id, title, words: '활성화 중 · 참여하지 않는 중', declined: true };
  }
  return {
    partyId: id,
    title,
    words: leader === undefined ? '활성화 중인 파티예요' : `${leader.name}님이 활성화했어요`,
    declined: false,
  };
}

// The running Parties first: the User's, those that wait for an answer, then the declined ones.
function groupOf(live: boolean, strip: MineStripView | null, start: string | null, now: Date): string {
  if (live) {
    return '활성화 중';
  }
  if (strip !== null) {
    return strip.declined ? '다른 활성 파티' : '활성화 알림';
  }
  return dayGroup(start, now);
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
  const others = quest.holders.filter(({ id }) => id !== meId).map(({ name }) => name);
  const place = next?.place?.label ?? '';
  return {
    questId: quest.id,
    title: quest.title,
    private: quest.joinPolicy === 'closed',
    badge: badgeOf(quest, live, sources),
    event: quest.globalEvent?.title ?? null,
    next:
      next === null
        ? null
        : {
            when: start === null ? '시간 미정' : whenWords(start, now),
            what: place === '' ? next.title : `${next.title} · ${place}`,
          },
    faces: [...quest.holders.filter(({ id }) => id === meId), ...quest.holders.filter(({ id }) => id !== meId)].map(
      ({ name }) => name,
    ),
    people: peopleOf(others),
    live,
    strip,
    group: past ? PAST : groupOf(live, strip, start, now),
    start: start === null ? Number.POSITIVE_INFINITY : new Date(start).getTime(),
    waiting: past ? 0 : quest.waitingJoinRequests,
    past,
  };
}

// The User's Quests but the Class Quests, then the past ones.
export function toMineCards(sources: MineSources): MineCardView[] {
  return [
    ...sources.quests.filter(({ classQuest }) => !classQuest).map((quest) => cardOf(quest, sources, false)),
    ...sources.past.map((quest) => cardOf(quest, sources, true)),
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
