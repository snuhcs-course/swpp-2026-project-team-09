/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-08  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { GlobalEvent, Quest } from '@/api/types';
import type { RecruitingQuest } from '@/api/party-types';
import { heldAlone, shownSubQuest } from '@/features/quests/adapter';
import { placeWithRoom } from '@/features/quests/booked-room';
import { koreaCalendar, koreaClock, koreaDay, koreaDaysAfter, koreaWeekday, WEEKDAYS } from '@/korea-time';

// What the 행사 tab and its sheet show of the Global Events.

export type EventFilter = 'all' | 'today' | 'week' | 'recruiting';

// The longest one sitting lasts, as the main server's Judgement holds it: 22:00 to 02:00 is one night, not a period.
const LONGEST_SITTING_MS = 24 * 60 * 60 * 1000;

type EventTimes = Pick<GlobalEvent, 'startsAt' | 'endsAt'>;

// Whether the event runs over a period, which its start and end alone tell, whoever made it.
export function isOverPeriod({ startsAt, endsAt }: EventTimes): boolean {
  return endsAt !== null && new Date(endsAt).getTime() - new Date(startsAt).getTime() > LONGEST_SITTING_MS;
}

// "오늘 18:00–20:00", or "11월 30일까지" for an event over a period.
export function eventTime(event: EventTimes, now: Date): string {
  return isOverPeriod(event) ? eventHours(event) : `${koreaDay(event.startsAt, now)} ${eventHours(event)}`;
}

// The hours alone, "18:00–20:00", where the date column says the day; "11월 30일까지" for an event over a period.
export function eventHours(event: EventTimes): string {
  if (event.endsAt !== null && isOverPeriod(event)) {
    const { month, date } = koreaCalendar(new Date(event.endsAt));
    return `${month}월 ${date}일까지`;
  }
  return event.endsAt === null
    ? koreaClock(event.startsAt)
    : `${koreaClock(event.startsAt)}–${koreaClock(event.endsAt)}`;
}

// Whether the event has begun and not yet ended: an exhibition until 11월 30일, or a night across midnight after it.
// An event without an end is never running: it is at its start.
export function isRunning({ startsAt, endsAt }: EventTimes, now: Date): boolean {
  return endsAt !== null && new Date(startsAt).getTime() <= now.getTime() && now.getTime() < new Date(endsAt).getTime();
}

// The date column of the `Events` frame: the day of the month, and "11월 · 오늘", "11월 · 내일" or "11월 · 토" under it.
// An event running now shows today, so that 오늘 shows no past day; the hours beside the place say until when.
export function eventDate(event: EventTimes, now: Date): { day: string; line: string } {
  const shown = isRunning(event, now) ? now : new Date(event.startsAt);
  const { month, date, weekday } = koreaCalendar(shown);
  const days = koreaDaysAfter(now, shown);
  const name = days === 0 ? '오늘' : days === 1 ? '내일' : WEEKDAYS[weekday];
  return { day: String(date), line: `${month}월 · ${name}` };
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
  // The recruiting Quests for it that the User can join, as the map card and the chat card count them: "모집 중인 파티
  // {n}" and the 파티 모집 중 filter.
  recruiting: number;
  // The User holds a 파티 for it, a Quest held with others or open to them, closed ones too: the "내 파티" mark.
  mine: boolean;
  // The 행사 tab's row and sheet: the date column, the hours beside the place, and the description.
  date: { day: string; line: string };
  hours: string;
  description: string;
}

export interface EventSources {
  events: readonly GlobalEvent[];
  announcers: readonly { eventId: string; announcer: string }[];
  recruiting: readonly RecruitingQuest[];
  quests: readonly Quest[];
  now: Date;
}

// Sunday ends the week, in Korea's calendar.
function daysToSunday(now: Date): number {
  return (7 - koreaWeekday(now)) % 7;
}

// "파티 모집 중" keeps an event with a recruiting Quest the User can join: the row's "모집 중인 파티 {n}". The User's
// own 파티 is not one: a 비공개 one with a Friend recruits nobody.
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

// The grey words of the search field, naming what `matches` reads: an event's time is not among them.
export const EVENT_SEARCH_HINT = '제목·장소·내용 검색';

function matches(event: GlobalEvent, search: string): boolean {
  const words = search.trim().toLowerCase();
  return (
    words === '' ||
    [event.title, event.place ?? '', event.description].some((text) => text.toLowerCase().includes(words))
  );
}

export function toEventViews(sources: EventSources, filter: EventFilter, search: string): EventView[] {
  const { events, announcers, recruiting, quests, now } = sources;
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
      mine: quests.some((quest) => quest.globalEvent?.id === event.id && !heldAlone(quest)),
      date: eventDate(event, now),
      hours: eventHours(event),
      description: event.description,
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
    .filter((quest) => quest.globalEvent?.id === eventId && !heldAlone(quest))
    .map((quest): RecruitRowView => {
      const next = shownSubQuest(quest);
      const leads = quest.leader?.id === meId;
      const where = [whenWords(next?.startsAt ?? null, now), placeWithRoom(next?.place?.label ?? '', quest.bookedRoom)];
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

// The Quest the User holds alone for the event: the main server ends it when they join another of the event, and
// `+ 파티 모집` edits it.
export function soloQuestFor(quests: readonly Quest[], eventId: string | null): Quest | null {
  if (eventId === null) {
    return null;
  }
  return quests.find(({ globalEvent, holders }) => globalEvent?.id === eventId && holders.length === 1) ?? null;
}
