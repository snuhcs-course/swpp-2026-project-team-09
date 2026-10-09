/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { JoinPolicy, LatLng, MyParty, Party, Quest, SubQuest } from '@/api/types';
import { koreaClock, koreaDate, koreaDaysAfter, koreaNextDay, sameKoreaDay } from '@/korea-time';

// What a row of the Quest list is drawn as, which gives its colour: a class; `open`, a Party that others may join;
// `closed`, a Party that takes nobody else, and a Quest that no Party names, such as a dinner with a Friend.
export type QuestRowTone = 'class' | 'open' | 'closed';

// One row of the Quest list, on the map and on the whole screen.
export interface QuestRowView {
  id: string;
  // `party` is every Quest that is not a class: the frames draw a Shared Quest as a Party.
  kind: 'class' | 'party';
  tone: QuestRowTone;
  // In the row's round, by its name in the design system: `clock` for a class, `users` for `open`, `lock` for
  // `closed`.
  icon: 'clock' | 'users' | 'lock';
  // The Party's that is marked with the Quest. Null for a class and for a Quest that no Party names.
  joinPolicy: JoinPolicy | null;
  // "다음 강의 · 23분 후", the list on the map's.
  kicker: string;
  // The frames' word for its kind, the list on the whole screen's: "강의", "공개 파티" or "비공개 파티 · 김민준".
  label: string;
  // "자료구조"
  title: string;
  // "14:00 · 301동 118호"
  meta: string;
  // "301동 118호", or "" for a Quest without a place.
  place: string;
  // "14:00", the start of the Sub Quest it shows, or "" without one.
  time: string;
  // How many days of Korea's calendar its start is after today, or null without a start.
  daysAway: number | null;
  // Every Sub Quest of it ended or was cancelled.
  ended: boolean;
  // Where the map goes on a press. Null for a Quest without a place.
  position: LatLng | null;
}

export interface QuestSources {
  quests: readonly Quest[];
  myParty: MyParty | null;
  parties: readonly Party[];
  // The User's own id, to leave the User out of the names of a Quest's Holders.
  meId: string;
  now: Date;
}

const MINUTE_MS = 60_000;

// The Sub Quest a row and a pin show: of those still to come, the one the User attends, or the first.
export function shownSubQuest(quest: Quest): SubQuest | null {
  const open = quest.subQuests.filter(({ cancelled, ended }) => !cancelled && !ended);
  return open.find(({ attending }) => attending) ?? open[0] ?? null;
}

// Where a Sub Quest's place is on the map. Null without a place, and for words alone, which have no point.
export function pointOf(place: SubQuest['place']): LatLng | null {
  return place === null || place.latitude === null || place.longitude === null
    ? null
    : { latitude: place.latitude, longitude: place.longitude };
}

export function positionOf(subQuest: SubQuest | null): LatLng | null {
  return pointOf(subQuest?.place ?? null);
}

function startOf(quest: Quest): number {
  const start = shownSubQuest(quest)?.startsAt ?? null;
  return start === null ? Number.POSITIVE_INFINITY : new Date(start).getTime();
}

// Where the User goes next.
export interface NextQuestView {
  id: string;
  // "자료구조"
  title: string;
  position: LatLng;
}

// Whether a Quest is still ahead of the User today: it starts today in Korea's time and has not ended. One that is
// going on, such as a class in progress, is ahead until its end; one without an end, until its start.
function aheadToday(quest: Quest, now: Date): boolean {
  const subQuest = shownSubQuest(quest);
  const start = subQuest?.startsAt ?? null;
  if (start === null || !sameKoreaDay(new Date(start), now)) {
    return false;
  }
  return new Date(subQuest?.endsAt ?? start).getTime() > now.getTime();
}

// The User's next Quest by time: of today's Quests that have a place and have not ended, the one that starts first.
// Null when none is left today.
export function toNextQuest(quests: readonly Quest[], now: Date): NextQuestView | null {
  const later = quests
    .filter((quest) => aheadToday(quest, now))
    .toSorted((first, second) => startOf(first) - startOf(second));
  for (const quest of later) {
    const position = positionOf(shownSubQuest(quest));
    if (position !== null) {
      return { id: quest.id, title: quest.title, position };
    }
  }
  return null;
}

// The Party that is marked with a Quest: the User's own or a listed one. Null for a Quest that no Party names, which
// is a Shared Quest, such as an accepted Meetup with a Friend, or a Quest the User holds alone.
export interface QuestParty {
  title: string;
  joinPolicy: JoinPolicy;
  // Whether it is the Party the User is in now.
  mine: boolean;
  memberCount: number;
  capacity: number;
}

export function partyOf(quest: Quest, myParty: MyParty | null, parties: readonly Party[]): QuestParty | null {
  if (myParty?.quest?.id === quest.id) {
    const { title, joinPolicy, members, capacity } = myParty;
    return { title, joinPolicy, mine: true, memberCount: members.length, capacity };
  }
  const listed = parties.find((party) => party.quest?.id === quest.id);
  if (listed === undefined) {
    return null;
  }
  const { title, joinPolicy, memberCount, capacity } = listed;
  return { title, joinPolicy, mine: false, memberCount, capacity };
}

// The names of a Quest's other Holders, "" when the User holds it alone.
export function otherHolders(quest: Quest, meId: string): string {
  return quest.holders
    .filter(({ id }) => id !== meId)
    .map(({ name }) => name)
    .join(', ');
}

export function waitWords(minutes: number): string {
  return minutes < 60 ? `${minutes}분 후` : `${Math.floor(minutes / 60)}시간 후`;
}

function classKicker(subQuest: SubQuest | null, next: boolean, now: Date): string {
  const start = subQuest?.startsAt ?? null;
  const end = subQuest?.endsAt ?? null;
  if (start === null) {
    return '강의';
  }
  const untilStart = new Date(start).getTime() - now.getTime();
  if (untilStart <= 0) {
    return end !== null && new Date(end).getTime() <= now.getTime() ? '강의' : '강의 · 수업 중';
  }
  return next ? `다음 강의 · ${waitWords(Math.ceil(untilStart / MINUTE_MS))}` : '강의';
}

// The frames word a Shared Quest that is no Party's, such as a dinner with a Friend, as a "비공개 파티", and a Party
// that takes requests as an open one. The words are the frames'; the kinds stay the glossary's.
function sharedKicker(quest: Quest, party: QuestParty | null, meId: string): string {
  const others = otherHolders(quest, meId);
  if (party === null) {
    return others === '' ? '퀘스트' : `비공개 파티 · ${others}`;
  }
  if (party.joinPolicy === 'closed') {
    return others === '' ? '비공개 파티' : `비공개 파티 · ${others}`;
  }
  return party.mine ? '공개 파티 · 활성화 중' : `공개 파티 · ${party.memberCount}명`;
}

function meta(subQuest: SubQuest | null): string {
  const label = subQuest?.place?.label ?? '';
  const start = subQuest?.startsAt ?? null;
  return [start === null ? '' : koreaClock(start), label].filter((part) => part !== '').join(' · ');
}

// The frames' words for a kind on the whole screen: a class, a Party that others may join, and anything else, with
// whom the User holds it.
function kindLabel(tone: QuestRowTone, quest: Quest, meId: string): string {
  if (tone === 'class') {
    return '강의';
  }
  if (tone === 'open') {
    return '공개 파티';
  }
  const others = otherHolders(quest, meId);
  return others === '' ? '비공개 파티' : `비공개 파티 · ${others}`;
}

const ROW_ICON = { class: 'clock', open: 'users', closed: 'lock' } as const;

function toneOf(quest: Quest, party: QuestParty | null): QuestRowTone {
  if (quest.classQuest) {
    return 'class';
  }
  return party === null || party.joinPolicy === 'closed' ? 'closed' : 'open';
}

// The rows of the Quest list, the earliest first. A Quest without a time comes last.
export function toQuestRows(sources: QuestSources): QuestRowView[] {
  const { quests, myParty, parties, meId, now } = sources;
  const byStart = quests.toSorted((first, second) => startOf(first) - startOf(second));
  const nextClass = byStart.find((quest) => quest.classQuest && startOf(quest) > now.getTime());
  return byStart.map((quest) => {
    const subQuest = shownSubQuest(quest);
    const party = quest.classQuest ? null : partyOf(quest, myParty, parties);
    const tone = toneOf(quest, party);
    const start = subQuest?.startsAt ?? null;
    return {
      id: quest.id,
      kind: quest.classQuest ? 'class' : 'party',
      tone,
      icon: ROW_ICON[tone],
      joinPolicy: party?.joinPolicy ?? null,
      kicker: quest.classQuest ? classKicker(subQuest, quest === nextClass, now) : sharedKicker(quest, party, meId),
      label: kindLabel(tone, quest, meId),
      title: party?.title ?? quest.title,
      meta: meta(subQuest),
      place: subQuest?.place?.label ?? '',
      time: start === null ? '' : koreaClock(start),
      daysAway: start === null ? null : koreaDaysAfter(now, new Date(start)),
      ended: subQuest === null && quest.subQuests.length > 0,
      position: positionOf(subQuest),
    };
  });
}

// A group of the Quest list on the whole screen, under its header.
export interface QuestGroup {
  title: string;
  rows: QuestRowView[];
}

// The groups of the `MainQuests` frame by the days from today to a Quest's start, the last day of each first. Their
// rows keep the list's order. Ended Quests are left out; a Quest without a start goes last, under "시간 미정".
export function toQuestGroups(rows: readonly QuestRowView[], now: Date): QuestGroup[] {
  const tomorrow = koreaNextDay(now);
  const groups = [
    { upTo: 0, title: `오늘 · ${koreaDate(now)}` },
    { upTo: 1, title: `내일 · ${koreaDate(tomorrow)}` },
    { upTo: 4, title: '이번 주' },
    { upTo: 11, title: '다음 주' },
    { upTo: Number.POSITIVE_INFINITY, title: '그 이후' },
  ];
  const shown = rows.filter(({ ended }) => !ended);
  const timed = groups.map(({ upTo, title }, index) => {
    const from = index === 0 ? Number.NEGATIVE_INFINITY : (groups[index - 1]?.upTo ?? 0) + 1;
    return {
      title,
      rows: shown.filter(({ daysAway }) => daysAway !== null && daysAway >= from && daysAway <= upTo),
    };
  });
  const untimed = { title: '시간 미정', rows: shown.filter(({ daysAway }) => daysAway === null) };
  return [...timed, untimed].filter((group) => group.rows.length > 0);
}
