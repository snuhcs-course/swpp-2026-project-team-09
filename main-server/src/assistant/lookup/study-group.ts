/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type PlanPerson, type StudyInput } from '../dto/answer.dto.js';
import { type DayItem, endOfDay, onDay, startOfDay } from '../free-time/free-time.js';
import { outOfReach } from '../free-time/tool-parts.js';
import { koreaDate } from '../korea-time.js';
import {
  addDays,
  checkBooking,
  clockOfMinutes,
  durationRefusal,
  lastBookableDate,
  minutesOfClock,
  PARTY_MAX,
  PARTY_REFUSAL,
  WAIT_DAYS_AHEAD,
  windowRefusal,
} from '../library/booking-rules.js';
import { type Catalogue } from '../library/catalogue.js';
import { pickStudyTime, type StudyBooking, type StudyDatePick, type StudyFacts } from '../library/study-pick.js';
import { type GroupRoom, groupRooms, studyRoomFor } from '../library/study-room.js';
import { windowOpening } from '../library/window-opening.js';

// The time and the room of a study answer together (P10 ticket 07), as proposeStudyRoom picks them: everyone's items
// and constraints, the room kind's hours in its steps, the walks to and from 관정관, the window as bounds and the length
// asked, three hours by default. The asker alone, or with too few Friends, gets the smallest room that books, with how
// many more it needs and no key.

// A study input is answered together (a 관정 group study room) when it says so or holds Friends.
export const isTogether = ({ together, people }: Pick<StudyInput, 'together' | 'people'>): boolean =>
  together || people.length > 1;

// What app a recalculated study input is answered for: alone, one that says `study-plan`; together, `study-group`.
export const studyCapabilityOf = (input: StudyInput): 'study-plan' | 'study-group' =>
  isTogether(input) ? 'study-group' : 'study-plan';

// A day together may be past the booking window, up to the days a request waits for it.
export function studyOutOfReach(input: StudyInput, now: Date): boolean {
  const today = koreaDate(now);
  return isTogether(input)
    ? input.date < today || input.date > addDays(today, WAIT_DAYS_AHEAD)
    : outOfReach(input.date, now);
}

const DEFAULT_MINUTES = 180;
const PERIOD_DAYS_MAX = 7;

export const NO_SHARED_DAY = '그날은 모두가 30분 이상 함께 있을 수 있는 시간이 없어요.';
export const NO_SHARED_PERIOD = '그 기간에는 모두가 30분 이상 함께 있을 수 있는 시간이 없어요.';

export interface GroupPerson {
  userId: string;
  // The asker's is 나.
  name: string;
  me: boolean;
  // Each day's items, by its date.
  itemsByDate: Readonly<Record<string, readonly DayItem[]>>;
  // The asker's Classes the conversation leaves out, by date, which their items no longer hold (P05 ticket 70).
  skippedByDate?: Readonly<Record<string, readonly DayItem[]>>;
  constraints: PlanPerson['constraints'];
}

export interface GroupTimeArgs {
  input: StudyInput;
  // The days to pick among, in order: the input's date, or a period's.
  dates: readonly string[];
  now: Date;
  catalogue: Catalogue;
  // The asker first.
  people: readonly GroupPerson[];
  kwanjeongPlaceId: string;
  walkingMinutes: (fromPlaceId: string, toPlaceId: string) => number;
}

export interface GroupPick {
  room: GroupRoom;
  // Every kind a party can book, 2층 first, each floor by size.
  rooms: GroupRoom[];
  minutes: number;
  booking: StudyBooking;
  facts: StudyFacts;
  // The other days' best, best first.
  others: StudyDatePick[];
  // The fewest people a room takes.
  fewest: number;
  moreNeeded: number;
  key: string | null;
  // Past the booking window, when it opens for the day.
  opens: Date | null;
}

export type GroupTime =
  { kind: 'pick'; pick: GroupPick } | { kind: 'none'; noPlan: NonNullable<AnswerReply['noPlan']> };

export const noPlanOf = (reason: 'no-fit' | 'no-shared-time', texts: readonly string[]): GroupTime => ({
  kind: 'none',
  noPlan: { reason, lines: texts.map((text) => [{ text, strong: false }]) },
});

const byFloor = (a: GroupRoom, b: GroupRoom): number =>
  (a.floor ?? 0) - (b.floor ?? 0) || a.capacity.max - b.capacity.max;

const fewestOf = (rooms: readonly GroupRoom[]): number => Math.min(...rooms.map(({ capacity }) => capacity.min));

// The kind the User chose while it holds them; else studyRoomFor's for them, or for the fewest a room takes.
function roomOf(
  catalogue: Catalogue,
  rooms: readonly GroupRoom[],
  chosen: string | null,
  people: number,
): GroupRoom | string {
  const picked = rooms.find(({ id, capacity }) => id === chosen && capacity.min <= people && people <= capacity.max);
  if (picked !== undefined) {
    return picked;
  }
  const found = studyRoomFor(catalogue, Math.max(people, fewestOf(rooms)));
  if ('refusal' in found) {
    return found.refusal.reason;
  }
  return rooms.find(({ id }) => id === found.space.id) ?? `${people}명이 함께 쓸 그룹스터디룸이 없어요`;
}

// The length asked; else from–until in the room's steps, up to its longest; else three hours.
function lengthOf({ minutes, window: { from, until } }: StudyInput, room: GroupRoom): number {
  if (minutes !== null) {
    return minutes;
  }
  if (from !== null && until !== null) {
    const span = minutesOfClock(until) - minutesOfClock(from);
    return Math.min(room.maxMinutes, Math.floor(span / room.stepMinutes) * room.stepMinutes);
  }
  return Math.min(DEFAULT_MINUTES, room.maxMinutes);
}

// The room's hours within the window, the start on a step.
function hoursIn(
  hours: { open: string; close: string },
  { from, until }: StudyInput['window'],
  step: number,
): StudyFacts['hours'] {
  const fromMinutes = from === null ? 0 : Math.ceil(minutesOfClock(from) / step) * step;
  const open = Math.max(minutesOfClock(hours.open), fromMinutes);
  const close = Math.min(
    minutesOfClock(hours.close),
    until === null ? Number.POSITIVE_INFINITY : minutesOfClock(until),
  );
  return { open: clockOfMinutes(open), close: clockOfMinutes(close) };
}

// A person's constraints as items of the day: not there before notBefore, setting out from their `from`; gone from
// leaveBy.
function constraintItems(date: string, constraints: PlanPerson['constraints']): DayItem[] {
  const [from = null] = constraints.flatMap((one) => (one.kind === 'from' ? [one.placeId] : []));
  return constraints.flatMap((one): DayItem[] => {
    if (one.kind === 'notBefore') {
      return [
        {
          id: 'notBefore',
          name: '',
          start: startOfDay(date),
          end: onDay(date, one.time),
          placeId: from,
          isClass: false,
        },
      ];
    }
    if (one.kind === 'leaveBy') {
      return [
        { id: 'leaveBy', name: '', start: onDay(date, one.time), end: endOfDay(date), placeId: null, isClass: false },
      ];
    }
    return [];
  });
}

export function factsOf(
  args: GroupTimeArgs,
  room: GroupRoom,
  hours: StudyFacts['hours'],
  minutes: number,
  dates: string[],
): StudyFacts {
  return {
    people: args.people.map(({ userId, itemsByDate, constraints }) => ({
      id: userId,
      itemsByDate: Object.fromEntries(
        dates.map((date) => [date, [...(itemsByDate[date] ?? []), ...constraintItems(date, constraints)]]),
      ),
    })),
    dates,
    hours,
    stepMinutes: room.stepMinutes,
    lengthMinutes: minutes,
    kwanjeongPlaceId: args.kwanjeongPlaceId,
    walkingMinutes: args.walkingMinutes,
    earliest: args.now,
  };
}

// The book card's key: "book:4F-group-6:2026-11-28:1500:120", with ":wait" past the booking window.
export const groupKeyOf = (spaceId: string, { date, start }: StudyBooking, minutes: number, waits: boolean): string =>
  `book:${spaceId}:${date}:${start.replace(':', '')}:${minutes}${waits ? ':wait' : ''}`;

function booked(args: GroupTimeArgs, picked: Omit<GroupPick, 'moreNeeded' | 'key' | 'opens'>): GroupTime {
  const { room, booking, minutes } = picked;
  const people = args.people.length;
  const moreNeeded = Math.max(0, picked.fewest - people);
  const waits = booking.date > lastBookableDate(room, args.now);
  const request = { date: booking.date, start: booking.start, minutes, ...(moreNeeded > 0 ? {} : { people }) };
  const checked = checkBooking(args.catalogue, room, request, args.now, waits);
  if ('refusals' in checked) {
    return noPlanOf(
      'no-fit',
      checked.refusals.map(({ reason }) => reason),
    );
  }
  return {
    kind: 'pick',
    pick: {
      ...picked,
      moreNeeded,
      key: moreNeeded > 0 ? null : groupKeyOf(room.id, booking, minutes, waits),
      opens: waits ? windowOpening(room, booking.date) : null,
    },
  };
}

// The group study room and its time for everyone, or why there is none.
export function studyGroupTime(args: GroupTimeArgs): GroupTime {
  const people = args.people.length;
  if (people > PARTY_MAX) {
    return noPlanOf('no-fit', [PARTY_REFUSAL]);
  }
  const rooms = groupRooms(args.catalogue).toSorted(byFloor);
  const room = roomOf(args.catalogue, rooms, args.input.chosen.roomSpaceId, people);
  if (typeof room === 'string') {
    return noPlanOf('no-fit', [room]);
  }
  const minutes = lengthOf(args.input, room);
  const duration = durationRefusal(room, minutes);
  if (duration !== null || room.hours === null) {
    return noPlanOf('no-fit', [duration?.reason ?? '그룹스터디룸의 여는 시간을 몰라요']);
  }
  const dates = args.dates.filter((date) => windowRefusal(room, date, args.now, true) === null);
  const [first = args.input.date] = args.dates;
  if (dates.length === 0) {
    return noPlanOf('no-fit', [windowRefusal(room, first, args.now, true)?.reason ?? '날짜를 알려 주세요']);
  }
  const facts = factsOf(args, room, hoursIn(room.hours, args.input.window, room.stepMinutes), minutes, dates);
  const [best, ...others] = pickStudyTime(facts);
  if (best === undefined || best.booking === null) {
    return noPlanOf('no-shared-time', [dates.length > 1 ? NO_SHARED_PERIOD : NO_SHARED_DAY]);
  }
  return booked(args, { room, rooms, minutes, booking: best.booking, facts, others, fewest: fewestOf(rooms) });
}

// The days a study together is asked for: the one named, a period's from today on, or the days a room can be booked
// now; a period too long is refused with its reason.
export function groupDates(
  { date, firstDay, lastDay }: { date?: string; firstDay?: string; lastDay?: string },
  now: Date,
  aheadDays: number,
): string[] | string {
  const today = koreaDate(now);
  if (date !== undefined) {
    return [date];
  }
  if (firstDay === undefined && lastDay === undefined) {
    return Array.from({ length: aheadDays + 1 }, (_, index) => addDays(today, index));
  }
  const first = firstDay ?? today;
  const last = lastDay ?? first;
  const days: string[] = [];
  for (let day = first > today ? first : today; day <= last && days.length <= PERIOD_DAYS_MAX; day = addDays(day, 1)) {
    days.push(day);
  }
  if (last < first || days.length > PERIOD_DAYS_MAX) {
    return `기간은 ${PERIOD_DAYS_MAX}일 안으로 정해 주세요`;
  }
  return days.length === 0 ? [first] : days;
}
