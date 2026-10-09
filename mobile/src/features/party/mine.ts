// AI-generated with Claude Opus 5.5, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import type { MyParty, Party, Quest } from '@/api/types';
import { koreaClock, koreaDaysAfter, koreaWeekday } from '@/korea-time';
import { shownSubQuest, waitWords } from '@/features/quests/adapter';
import { whenOf } from './posts';

// 내 파티, the frame's `PartyMine`: the User's Quests but the Class Quests, as cards in groups.

export type MineFilter = 'all' | 'private' | 'public';

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
  // The Quest's Party runs without the User.
  strip: { partyId: string; title: string; words: string } | null;
  group: string;
  start: number;
  // The requests to join waiting for the User's answer, on a Quest the User leads.
  waiting: number;
}

export interface MineGroup {
  title: string;
  cards: MineCardView[];
}

const GROUPS = ['활성화 중', '활성화 알림', '오늘', '내일', '이번 주', '다음 주', '그 이후', '시간 미정'] as const;
const MINUTE_MS = 60_000;

// By the days to the start in Korea's time: this week runs to Sunday, the next week to the Sunday after.
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

function peopleOf(others: readonly string[]): string {
  const [first] = others;
  if (first === undefined) {
    return '나';
  }
  return others.length > 1 ? `나, ${first} 외 ${others.length - 1}명` : `나, ${first}`;
}

function badgeOf(quest: Quest, myParty: MyParty | null, live: boolean, meId: string): MineCardView['badge'] {
  if (live && myParty !== null) {
    const sharing = myParty.members.filter(({ id, visible }) => id !== meId && visible).length + 1;
    return { label: `활성화 중 · ${sharing}명 위치 공유`, live: true };
  }
  const holders = quest.holders.length;
  return quest.joinPolicy === 'closed'
    ? { label: `멤버 ${holders}명`, live: false }
    : { label: `모집 중 · ${holders}/${quest.capacity}명`, live: false };
}

export interface MineSources {
  quests: readonly Quest[];
  myParty: MyParty | null;
  parties: readonly Party[];
  meId: string;
  now: Date;
}

function cardOf(quest: Quest, { myParty, parties, meId, now }: MineSources): MineCardView {
  const next = shownSubQuest(quest);
  const start = next?.startsAt ?? null;
  const live = myParty?.quest?.id === quest.id;
  const running = live ? undefined : parties.find((party) => party.quest?.id === quest.id);
  const others = quest.holders.filter(({ id }) => id !== meId).map(({ name }) => name);
  const place = next?.place?.label ?? '';
  const group = live ? '활성화 중' : running === undefined ? dayGroup(start, now) : '활성화 알림';
  return {
    questId: quest.id,
    title: quest.title,
    private: quest.joinPolicy === 'closed',
    badge: badgeOf(quest, myParty, live, meId),
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
    strip:
      running === undefined
        ? null
        : {
            partyId: running.id,
            title: running.title,
            words: running.leader === undefined ? '활성화 중인 파티예요' : `${running.leader.name}님이 활성화했어요`,
          },
    group,
    start: start === null ? Number.POSITIVE_INFINITY : new Date(start).getTime(),
    waiting: quest.waitingJoinRequests,
  };
}

export function toMineCards(sources: MineSources): MineCardView[] {
  return sources.quests.filter(({ classQuest }) => !classQuest).map((quest) => cardOf(quest, sources));
}

export function filterMine(cards: readonly MineCardView[], filter: MineFilter): MineCardView[] {
  return cards.filter((card) => filter === 'all' || card.private === (filter === 'private'));
}

// In the frame's order of groups, each by the next Sub Quest's start.
export function groupMine(cards: readonly MineCardView[]): MineGroup[] {
  return GROUPS.map((title) => ({
    title,
    cards: cards.filter(({ group }) => group === title).toSorted((one, other) => one.start - other.start),
  })).filter(({ cards: shown }) => shown.length > 0);
}
