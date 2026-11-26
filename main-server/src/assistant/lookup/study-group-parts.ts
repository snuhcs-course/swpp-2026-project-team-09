/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  type AnswerLine,
  type AnswerReply,
  type ConditionChip,
  type GroupRoomKind,
  type MapScene,
  type PlacePoint,
  type Plan,
  type PlanPart,
  type StudyGroup,
  type StudyInput,
  type TimeBand,
} from '../dto/answer.dto.js';
import { byStart, clockOf, type DayItem, onDay } from '../free-time/free-time.js';
import { type OtherFriend } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { busyIn, halfHoursAround } from '../gathering/meal-scene.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { durationWords } from '../library/booking-rules.js';
import { cardSpace } from '../library/library-card.js';
import { arrivalsOf } from '../library/study-pick.js';
import { type GroupRoom, monthDayWords, stayNote } from '../library/study-room.js';
import { type GroupPerson, type GroupPick, type GroupTime } from './study-group.js';
import { studyDayWords } from './study-group-words.js';
import { studyOthers } from './study-others.js';
import { KWANJEONG_BUILDING } from './study-plan-parts.js';

// The one plan of a study answer together (P10 ticket 07): a 관정 group study room at the time `study-group.ts` picks,
// each person's part with their arrival, the time card with everyone's lanes and the asker's other Friends, and the
// group the ticket draws.

// Where a person sets out from when no item of theirs comes before their stay.
export interface SetOut {
  placeId: string;
  basis: 'chosen' | 'location';
}

export interface GroupAnswerArgs {
  time: GroupTime;
  input: StudyInput;
  now: Date;
  people: readonly GroupPerson[];
  setOut: ReadonlyMap<string, SetOut>;
  // The asker's Friends not in the plan, with their day.
  others: readonly OtherFriend[];
  kwanjeong: PlacePoint;
  walkingMinutes: (fromPlaceId: string, toPlaceId: string) => number;
  placePoint: (placeId: string) => PlacePoint;
  placeLabel: (placeId: string) => string;
}

const BAND_BEFORE_MS = 60 * MINUTE_MS;
const BAND_AFTER_MS = 30 * MINUTE_MS;

const strong = (text: string): AnswerLine[number] => ({ text, strong: true });
const plain = (text: string): AnswerLine[number] => ({ text, strong: false });

// "6인실" of "그룹스터디룸 6인실" or "그룹스터디룸 8인실 (G401)".
const kindName = ({ name }: GroupRoom): string =>
  name
    .replace(/^그룹스터디룸 /u, '')
    .replace(/ \(.*\)$/u, '')
    .trim();

function kindOf(room: GroupRoom): GroupRoomKind {
  const space = cardSpace(room, room.seatNos);
  if (space === null) {
    throw new Error(`The group room ${room.id} has no library space`);
  }
  return {
    spaceId: room.id,
    floor: room.floor ?? 0,
    name: kindName(room),
    capacity: { min: room.capacity.min, max: room.capacity.max },
    space,
  };
}

function fitOf({ capacity: { min, max } }: GroupRoom, people: number): { fits: boolean; reason: string | null } {
  if (people < min) {
    return { fits: false, reason: `${min}명부터` };
  }
  return people > max ? { fits: false, reason: `${max}명까지` } : { fits: true, reason: null };
}

// "11월 29일 09:00".
const openingWords = (opens: Date): string => `${monthDayWords(koreaDate(opens))} ${clockOf(opens)}`;

function groupOf({ room, rooms, moreNeeded, key, opens }: GroupPick, people: number): StudyGroup {
  return {
    room: kindOf(room),
    rooms: rooms.map((each) => ({ ...kindOf(each), ...fitOf(each, people) })),
    people,
    moreNeeded,
    key,
    useDescOptions: room.useDescOptions ?? [],
    opens: opens === null ? null : openingWords(opens),
    request: null,
  };
}

const at = (date: string, clock: string): Date => onDay(date, clock);

function partOf(person: GroupPerson, index: number, { booking }: GroupPick, args: GroupAnswerArgs): PlanPart {
  const { date } = booking;
  const stay = booking.stays[index];
  const from = at(date, stay?.from ?? booking.start);
  const until = at(date, stay?.until ?? booking.end);
  const items: readonly DayItem[] = person.itemsByDate[date] ?? [];
  const before = items
    .filter(({ end, placeId }) => end <= from && placeId !== null)
    .toSorted(byStart)
    .at(-1);
  const [after] = items.filter(({ start }) => start >= until).toSorted(byStart);
  const beforeAt = before?.placeId ?? null;
  const origin =
    beforeAt === null ? (args.setOut.get(person.userId) ?? null) : { placeId: beforeAt, basis: 'timetable' as const };
  const walk = origin === null ? null : args.walkingMinutes(origin.placeId, args.kwanjeong.placeId);
  return {
    userId: person.userId,
    name: person.me ? '나' : person.name,
    me: person.me,
    origin: origin === null ? null : { place: args.placePoint(origin.placeId), basis: origin.basis },
    leaveAt: walk === null ? null : koreaTime(new Date(from.getTime() - walk * MINUTE_MS)),
    walkMinutes: walk,
    arriveAt: koreaTime(from),
    leaveBy: until < at(date, booking.end) ? koreaTime(until) : null,
    next:
      after === undefined
        ? null
        : { startAt: koreaTime(after.start), place: after.placeId === null ? null : args.placePoint(after.placeId) },
  };
}

const position = ({ latitude, longitude }: PlacePoint): { latitude: number; longitude: number } => ({
  latitude,
  longitude,
});

function sceneOf(parts: readonly PlanPart[], { booking, room }: GroupPick, { kwanjeong }: GroupAnswerArgs): MapScene {
  const located = parts.flatMap((part) => (part.origin === null ? [] : [{ part, origin: part.origin }]));
  return {
    people: located.map(({ part, origin }) => ({
      userId: part.userId,
      name: part.name,
      me: part.me,
      at: position(origin.place),
      source: origin.basis === 'location' ? ('building' as const) : ('timetable' as const),
      tag: part.walkMinutes !== null && part.walkMinutes > 0 ? `${part.name} · ${part.walkMinutes}분` : part.name,
    })),
    places: [{ place: kwanjeong, role: 'pick', tag: `${room.floor ?? ''}층 그룹스터디룸 · ${parts.length}명` }],
    routes: located.flatMap(({ part, origin }) =>
      part.walkMinutes === null || part.walkMinutes === 0
        ? []
        : [
            {
              userId: part.userId,
              role: part.me ? ('me' as const) : ('friend' as const),
              from: position(origin.place),
              to: position(kwanjeong),
              minutes: part.walkMinutes,
            },
          ],
    ),
    flags: [{ at: position(kwanjeong), text: `${booking.start} 공부`, role: 'place' }],
  };
}

function bandOf({ booking, minutes }: GroupPick, args: GroupAnswerArgs): TimeBand {
  const start = at(booking.date, booking.start);
  const end = at(booking.date, booking.end);
  const { from, until } = halfHoursAround(
    Math.max(args.now.getTime(), start.getTime() - BAND_BEFORE_MS),
    end.getTime() + BAND_AFTER_MS,
  );
  const label = args.placeLabel;
  return {
    range: { startAt: koreaTime(from), endAt: koreaTime(until) },
    now: koreaTime(args.now),
    lanes: args.people.map(({ userId, name, me, itemsByDate }) => ({
      userId,
      name: me ? '나' : name,
      busy: busyIn(itemsByDate[booking.date] ?? [], from, until, label),
    })),
    ...studyOthers(
      args.others,
      { date: booking.date, now: args.now, placeId: args.kwanjeong.placeId, start, end },
      { from, until, label },
    ),
    startAt: koreaTime(start),
    endAt: koreaTime(end),
    text: `${booking.start}–${booking.end} · ${durationWords(minutes)}`,
  };
}

// When each person comes, and who leaves before the end: "지은 15:19 도착 · 16:56에 먼저 나서요".
function notesOf({ booking, facts }: GroupPick, people: readonly GroupPerson[]): string[] {
  const arrivals = arrivalsOf(facts, booking);
  return booking.stays.map((stay, index) =>
    stayNote(people[index]?.name ?? '', arrivals[index] ?? null, stay, booking),
  );
}

function linesOf(pick: GroupPick, people: readonly GroupPerson[]): AnswerLine[] {
  const { room, booking, moreNeeded, opens, fewest } = pick;
  const partial = notesOf(pick, people).filter((_, index) => {
    const stay = booking.stays[index];
    return stay !== undefined && (stay.from > booking.start || stay.until < booking.end);
  });
  return [
    [strong(`그룹스터디룸 ${room.floor ?? ''}층 ${kindName(room)}`), plain(` · ${people.length}명`)],
    ...(moreNeeded > 0 ? [[plain(`${fewest}명부터 예약할 수 있어요 · ${moreNeeded}명 더`)]] : []),
    ...(opens === null ? [] : [[plain(`${openingWords(opens)}부터 예약할 수 있어요`)]]),
    ...(partial.length === 0 ? [] : [[plain(partial.join(' · '))]]),
  ].slice(0, 3);
}

function planOf(pick: GroupPick, args: GroupAnswerArgs): Plan {
  const { booking, minutes, fewest } = pick;
  const parts = args.people.map((person, index) => partOf(person, index, pick, args));
  return {
    id: KWANJEONG_BUILDING,
    title: `${KWANJEONG_BUILDING}에서 같이 공부`,
    place: args.kwanjeong,
    startAt: koreaTime(at(booking.date, booking.start)),
    endAt: koreaTime(at(booking.date, booking.end)),
    togetherMinutes: minutes,
    meeting: null,
    parts,
    subQuests: [],
    lines: linesOf(pick, args.people),
    basis: [
      `모두가 비는 때: ${studyDayWords(booking.date, koreaDate(args.now))} ${booking.start}–${booking.end}`,
      `그룹스터디룸은 ${fewest}명부터 예약할 수 있어요`,
      ...notesOf(pick, args.people),
    ],
    scene: sceneOf(parts, pick, args),
    band: bandOf(pick, args),
    study: { spaces: [], book: null, liveSeats: 'kwanjeong', group: groupOf(pick, args.people.length) },
  };
}

const chip = (kind: ConditionChip['kind'], text: string, userId: string | null = null): ConditionChip => ({
  kind,
  text,
  userId,
});

// The Friends of the plan by name, and the window the User set.
function chipsOf({ people, input: { window } }: GroupAnswerArgs): ConditionChip[] {
  return [
    ...people.filter(({ me }) => !me).map(({ userId, name }) => chip('person', name, userId)),
    ...(window.from === null ? [] : [chip('from', `${window.from}부터`)]),
    ...(window.until === null ? [] : [chip('until', `${window.until}까지`)]),
  ];
}

// The answer together: its one plan on the day picked, or why there is none.
export function studyGroupAnswer(args: GroupAnswerArgs): AnswerReply {
  const { time, input } = args;
  const shared = { chips: chipsOf(args), dropped: [], closed: [], choosable: true as const };
  if (time.kind === 'none') {
    return { input, ...shared, plans: [], noPlan: time.noPlan };
  }
  return {
    input: { ...input, date: time.pick.booking.date },
    ...shared,
    plans: [planOf(time.pick, args)],
    noPlan: null,
  };
}
