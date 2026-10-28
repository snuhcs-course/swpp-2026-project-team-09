/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { josa } from 'es-hangul';
import { byName } from '../../friends/dto/friends.dto.js';
import { JoinPolicy, QuestBoard } from '../../generated/prisma/client.js';
import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { descriptionSchema, titleSchema } from '../../quests/dto/quest-requests.dto.js';
import { type FoundKind } from '../found-ids.js';
import { koreaTime } from '../korea-time.js';
import {
  BREAKFAST_UNTIL_MINUTES,
  DINNER_FROM_MINUTES,
  EVENT_CAPACITY,
  LEAD_MINUTES,
  LUNCH_CAPACITY,
  LUNCH_FROM_MINUTES,
  LUNCH_SLOT_UNTIL_MINUTES,
  LUNCH_UNTIL_MINUTES,
  NEXT_CLASS_WITHIN_MINUTES,
  REPEAT_WINDOW_DAYS,
  REPEATS_MIN,
  type Template,
} from './constants.js';
import { clockOf, koreaAt, koreaMinutes, koreaShort, minutesOf } from './korea-day.js';
import { type ClassSpan, gongangStarted, isFree, nextClass } from './timetable-status.js';

// The four templates: each decides from plain data whether it applies now, and what it would do on a tap. A
// Proposal's values go to proposeQuest as the model would give them, so that the chat's checks decide it.

export type Screen = 'main' | 'events' | 'party';

// proposeQuest's input, as a template fills it.
export interface ProposalInput {
  title: string;
  description?: string;
  joinPolicy: JoinPolicy;
  board?: QuestBoard;
  capacity: number;
  startsAt?: string;
  placeId?: string;
  globalEventId?: string;
  inviteeIds?: string[];
}

// An id the Proposal may take, as if a resolver had returned it.
export interface FoundId {
  kind: FoundKind;
  id: string;
}

export type CandidateAction =
  { type: 'proposal'; input: ProposalInput; found: FoundId[] } | { type: 'route'; placeId: string; name: string };

export interface Candidate {
  template: Template;
  text: string;
  reason: string;
  // The User's own count behind repeat_last, 0 for the others.
  repeats: number;
  action: CandidateAction;
}

export interface NamedPlace {
  id: string;
  name: string;
}

// One of the User's class times today.
export interface TodaysClass extends ClassSpan {
  courseName: string;
  place: NamedPlace | null;
}

// A Friend whose friendship shares, with their class times today.
export interface FriendToday {
  id: string;
  name: string;
  times: ClassSpan[];
}

// A Quest the User led, by its first Sub Quest with a Place.
export interface LedQuest {
  id: string;
  startsAt: Date;
  place: NamedPlace;
  joinPolicy: JoinPolicy;
  board: QuestBoard | null;
  capacity: number;
  description: string;
  holderIds: string[];
}

const MINUTE_MS = 60 * 1000;

const TITLE_MAX = titleSchema.maxLength ?? 50;
const DESCRIPTION_MAX = descriptionSchema.maxLength ?? 200;

// The text cut to `max` characters with an ellipsis, so that a long name never makes the title refused.
function shorten(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

// The next quarter hour at least 15 minutes ahead.
export function leadStart(now: Date): Date {
  const quarter = 15 * MINUTE_MS;
  return new Date(Math.ceil((now.getTime() + LEAD_MINUTES * MINUTE_MS) / quarter) * quarter);
}

// The User is free between 11:00 and 14:00, and a Friend whose friendship shares is free now with a class today. The
// first such Friend in the order of the User's list is named.
export function lunchWithFreeFriend(
  now: Date,
  own: readonly ClassSpan[],
  friends: readonly FriendToday[],
): Candidate | null {
  const minutes = koreaMinutes(now);
  if (minutes < LUNCH_FROM_MINUTES || minutes >= LUNCH_UNTIL_MINUTES || !isFree(own, minutes)) {
    return null;
  }
  const friend = friends.toSorted(byName).find(({ times }) => times.length > 0 && isFree(times, minutes));
  if (friend === undefined) {
    return null;
  }
  const withFriend = josa(friend.name, '이랑/랑');
  return {
    template: 'lunch_with_free_friend',
    text: `${withFriend} 점심 어때요?`,
    reason: `${gongangStarted(own, minutes) ? '공강 시작' : '점심시간'} · ${friend.name}도 공강`,
    repeats: 0,
    action: {
      type: 'proposal',
      input: {
        title: shorten(`${withFriend} 점심`, TITLE_MAX),
        joinPolicy: JoinPolicy.closed,
        capacity: LUNCH_CAPACITY,
        startsAt: koreaTime(leadStart(now)),
        inviteeIds: [friend.id],
      },
      found: [{ kind: 'friend', id: friend.id }],
    },
  };
}

// On the main screen, the User's next class today starts within an hour and has a Place.
export function routeToNextClass(screen: Screen, now: Date, classes: readonly TodaysClass[]): Candidate | null {
  const minutes = koreaMinutes(now);
  const next = screen === 'main' ? nextClass(classes, minutes) : undefined;
  if (next === undefined || next.place === null || minutesOf(next.startTime) - minutes > NEXT_CLASS_WITHIN_MINUTES) {
    return null;
  }
  return {
    template: 'route_to_next_class',
    text: `${next.place.name}까지 길 안내할까요?`,
    reason: `${next.courseName} ${next.startTime} 시작`,
    repeats: 0,
    action: { type: 'route', placeId: next.place.id, name: next.place.name },
  };
}

// The open card is a published event that has not ended: an open 파티 on the show Board that starts with it. An event
// without an end ends as it starts.
export function partyForOpenEvent(now: Date, event: PublishedGlobalEventDto | undefined): Candidate | null {
  if (event === undefined || event.startsAt === null || new Date(event.endsAt ?? event.startsAt) <= now) {
    return null;
  }
  const going = ' 같이 가요';
  return {
    template: 'party_for_open_event',
    text: `${shorten(event.title, 30)} 같이 갈 파티 만들까요?`,
    reason: `열어 본 행사 · ${koreaShort(new Date(event.startsAt))}`,
    repeats: 0,
    action: {
      type: 'proposal',
      input: {
        title: `${shorten(event.title, TITLE_MAX - going.length)}${going}`,
        description: shorten(`${event.title} 같이 갈 사람 모집해요`, DESCRIPTION_MAX),
        joinPolicy: JoinPolicy.open,
        board: QuestBoard.show,
        capacity: EVENT_CAPACITY,
        globalEventId: event.id,
      },
      found: [{ kind: 'globalEvent', id: event.id }],
    },
  };
}

export type MealSlot = '아침' | '점심' | '저녁';

export function mealSlotOf(minutes: number): MealSlot | null {
  if (minutes < BREAKFAST_UNTIL_MINUTES) {
    return '아침';
  }
  if (minutes < LUNCH_SLOT_UNTIL_MINUTES) {
    return '점심';
  }
  return minutes >= DINNER_FROM_MINUTES ? '저녁' : null;
}

// The User's habit: the Place and meal slot of two or more Quests they led in the last 14 days, the most Quests first,
// then the most recent. Each Quest's start is in the window.
export function habitOf(now: Date, led: readonly LedQuest[]): LedQuest[] | undefined {
  const since = now.getTime() - REPEAT_WINDOW_DAYS * 24 * 60 * MINUTE_MS;
  const groups = new Map<string, LedQuest[]>();
  for (const quest of led.filter(({ startsAt }) => startsAt.getTime() >= since && startsAt <= now)) {
    const slot = mealSlotOf(koreaMinutes(quest.startsAt));
    if (slot !== null) {
      const key = `${quest.place.id} ${slot}`;
      groups.set(key, [...(groups.get(key) ?? []), quest]);
    }
  }
  const latest = (quests: readonly LedQuest[]): number => Math.max(...quests.map(({ startsAt }) => startsAt.getTime()));
  return [...groups.values()]
    .filter((quests) => quests.length >= REPEATS_MIN)
    .toSorted((a, b) => b.length - a.length || latest(b) - latest(a))[0];
}

// The time of day of `last` at its next occurrence at least 15 minutes ahead, today or tomorrow.
export function nextOccurrence(now: Date, last: Date): Date {
  const today = koreaAt(now, koreaMinutes(last));
  return today.getTime() >= now.getTime() + LEAD_MINUTES * MINUTE_MS ? today : koreaAt(now, koreaMinutes(last), 1);
}

// The habit again, at its slot's next occurrence: the last Quest's Place, Join Policy, Board, capacity and
// description. A Closed one invites those of its Holders who are still Friends, since a 비공개 파티 needs one.
export function repeatLast(now: Date, led: readonly LedQuest[], friendIds: ReadonlySet<string>): Candidate | null {
  const habit = habitOf(now, led);
  const last = habit?.toSorted((a, b) => b.startsAt.getTime() - a.startsAt.getTime())[0];
  const slot = last === undefined ? null : mealSlotOf(koreaMinutes(last.startsAt));
  if (habit === undefined || last === undefined || slot === null) {
    return null;
  }
  const startsAt = nextOccurrence(now, last.startsAt);
  const prefix = '지난번처럼 ';
  const title = `${prefix}${shorten(last.place.name, TITLE_MAX - prefix.length - `에서 ${slot}`.length)}에서 ${slot}`;
  const closed = last.joinPolicy === JoinPolicy.closed;
  const invitees = closed ? last.holderIds.filter((id) => friendIds.has(id)).slice(0, last.capacity - 1) : [];
  const day = startsAt.getTime() < koreaAt(now, 0, 1).getTime() ? '오늘' : '내일';
  return {
    template: 'repeat_last',
    text: `${title} 어때요?`,
    reason: `최근 2주 ${habit.length}번 · ${day} ${clockOf(koreaMinutes(startsAt))}`,
    repeats: habit.length,
    action: {
      type: 'proposal',
      input: {
        title,
        description: closed || last.description.trim() !== '' ? last.description : title,
        joinPolicy: last.joinPolicy,
        board: last.board ?? undefined,
        capacity: last.capacity,
        startsAt: koreaTime(startsAt),
        placeId: last.place.id,
        inviteeIds: invitees,
      },
      found: [{ kind: 'place', id: last.place.id }, ...invitees.map((id) => ({ kind: 'friend' as const, id }))],
    },
  };
}
