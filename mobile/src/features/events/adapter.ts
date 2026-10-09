// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08 to 2026-10-09, prompted by fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
import type { MatchingRequest } from '@/api/matching-types';
import type { GlobalEvent, Quest } from '@/api/types';
import type { RecruitingQuest } from '@/api/party-types';
import { shownSubQuest } from '@/features/quests/adapter';
import { agoWords } from '@/features/quests/room-adapter';
import { koreaClock, koreaDay, koreaDaysAfter, koreaWeekday } from '@/korea-time';

// What the 행사 tab, its sheets and the AI 매칭 신청 list show of the Global Events.

export type EventFilter = 'all' | 'today' | 'week' | 'recruiting';

// "오늘 18:00–20:00"
export function eventTime(event: Pick<GlobalEvent, 'startsAt' | 'endsAt'>, now: Date): string {
  const hours =
    event.endsAt === null ? koreaClock(event.startsAt) : `${koreaClock(event.startsAt)}–${koreaClock(event.endsAt)}`;
  return `${koreaDay(event.startsAt, now)} ${hours}`;
}

// How many recruiting Quests gather for each Global Event.
export function recruitingCounts(recruiting: readonly RecruitingQuest[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const { globalEvent } of recruiting) {
    if (globalEvent !== null) {
      counts.set(globalEvent.id, (counts.get(globalEvent.id) ?? 0) + 1);
    }
  }
  return counts;
}

export interface EventView {
  id: string;
  title: string;
  // Who announced it, where the app knows.
  source: string | null;
  time: string;
  place: string | null;
  sourceUrl: string | null;
  // The recruiting Quests for it.
  recruiting: number;
  // The User holds a Quest for it.
  mine: boolean;
  // The User's request for Matching on it waits.
  matching: boolean;
}

export interface EventSources {
  events: readonly GlobalEvent[];
  announcers: readonly { eventId: string; announcer: string }[];
  recruiting: readonly RecruitingQuest[];
  quests: readonly Quest[];
  matching: readonly MatchingRequest[];
  now: Date;
}

// Sunday ends the week, in Korea's calendar.
function daysToSunday(now: Date): number {
  return (7 - koreaWeekday(now)) % 7;
}

function passes(event: GlobalEvent, recruiting: number, filter: EventFilter, now: Date): boolean {
  const days = koreaDaysAfter(now, new Date(event.startsAt));
  if (filter === 'today') {
    return days <= 0;
  }
  if (filter === 'week') {
    return days <= daysToSunday(now);
  }
  return filter !== 'recruiting' || recruiting > 0;
}

function matches(event: GlobalEvent, search: string): boolean {
  const words = search.trim().toLowerCase();
  return (
    words === '' ||
    [event.title, event.place ?? '', event.description].some((text) => text.toLowerCase().includes(words))
  );
}

export function toEventViews(sources: EventSources, filter: EventFilter, search: string): EventView[] {
  const { events, announcers, recruiting, quests, matching, now } = sources;
  const counts = recruitingCounts(recruiting);
  return events
    .filter((event) => matches(event, search) && passes(event, counts.get(event.id) ?? 0, filter, now))
    .map((event) => ({
      id: event.id,
      title: event.title,
      source: announcers.find(({ eventId }) => eventId === event.id)?.announcer ?? null,
      time: eventTime(event, now),
      place: event.place,
      sourceUrl: event.sourceUrl,
      recruiting: counts.get(event.id) ?? 0,
      mine: quests.some(({ globalEvent }) => globalEvent?.id === event.id),
      matching: matching.some(({ globalEventId, state }) => globalEventId === event.id && state === 'waiting'),
    }));
}

// "17:40" today, "내일 17:40" or "10월 7일 (수) 17:40" later.
function whenWords(startsAt: string | null, now: Date): string {
  if (startsAt === null) {
    return '';
  }
  const day = koreaDay(startsAt, now);
  return day === '오늘' ? koreaClock(startsAt) : `${day} ${koreaClock(startsAt)}`;
}

function metaOf(parts: readonly string[]): string {
  return parts.filter((part) => part !== '').join(' · ');
}

export interface RecruitRowView {
  questId: string;
  title: string;
  // `mine` and `in` are the User's own Quest, which the User leads or holds; `leader` names another's Leader.
  badge: { kind: 'mine' | 'in' | 'leader'; label: string };
  fill: string;
  meta: string;
  held: boolean;
}

// The rows of 파티 찾기/모집: the User's own Quest for the event first, then the others gathering for it.
export function toRecruitRows(
  eventId: string,
  quests: readonly Quest[],
  recruiting: readonly RecruitingQuest[],
  meId: string,
  now: Date,
): RecruitRowView[] {
  const own = quests
    .filter(({ globalEvent }) => globalEvent?.id === eventId)
    .map((quest): RecruitRowView => {
      const next = shownSubQuest(quest);
      const leads = quest.leader?.id === meId;
      const where = [whenWords(next?.startsAt ?? null, now), next?.place?.label ?? ''];
      return {
        questId: quest.id,
        title: quest.title,
        badge: leads ? { kind: 'mine', label: '내 파티' } : { kind: 'in', label: '참여 중' },
        fill: `${quest.holders.length}/${quest.capacity}명`,
        meta: metaOf(leads ? where : [quest.leader?.name ?? '', ...where]),
        held: true,
      };
    });
  const others = recruiting.map((quest): RecruitRowView => ({
    questId: quest.id,
    title: quest.title,
    badge: { kind: 'leader', label: quest.leader.name },
    fill: `${quest.holderCount}/${quest.capacity}명`,
    meta: metaOf([whenWords(quest.nextSubQuest.startsAt, now), quest.nextSubQuest.place?.label ?? '']),
    held: false,
  }));
  return [...own, ...others];
}

// The Quest the User holds with others for the event: its 파티, which `+ 파티 모집` leads to.
export function sharedQuestFor(quests: readonly Quest[], eventId: string): Quest | null {
  return quests.find(({ globalEvent, holders }) => globalEvent?.id === eventId && holders.length > 1) ?? null;
}

export interface MatchingRowView {
  eventId: string;
  title: string;
  // "오늘 18:00–20:00 · 301동 대강당"
  when: string;
  size: number;
  // "방금 신청", "5분 전"
  ago: string;
}

export function toMatchingRows(
  requests: readonly MatchingRequest[],
  events: readonly GlobalEvent[],
  now: Date,
): MatchingRowView[] {
  return requests
    .filter(({ state }) => state === 'waiting')
    .map((request) => {
      const event = events.find(({ id }) => id === request.globalEventId);
      const ago = agoWords(request.arrivedAt, now);
      return {
        eventId: request.globalEventId,
        title: event?.title ?? '',
        when: event === undefined ? '' : metaOf([eventTime(event, now), event.place ?? '']),
        size: request.size,
        ago: ago === '방금' ? '방금 신청' : ago,
      };
    });
}
