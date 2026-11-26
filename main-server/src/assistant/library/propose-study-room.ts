/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { shownMinutes } from '../../travel/travel.js';
import { defineTool, noneFound, type Tool, type ToolContext } from '../feature.js';
import { clockOf } from '../free-time/free-time.js';
import { dateInput } from '../free-time/tool-parts.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';
import {
  addDays,
  checkBooking,
  durationRefusal,
  lastBookableDate,
  type Refusal,
  windowRefusal,
} from './booking-rules.js';
import { KWANJEONG_PLACE_NUMBER, type LibrarySpace, roomLabelOf } from './catalogue.js';
import { bookCard, type LibraryCompanion } from './library-card.js';
import { gated, type LibraryServices, refused, showCard, SIGN_IN_FIRST } from './library-parts.js';
import { arrivalsOf, pickStudyTime, type StudyBooking, type StudyDatePick, type StudyFacts } from './study-pick.js';
import { monthDayWords, stayNote, studyRoomFor, weekdayWord } from './study-room.js';
import { windowOpening } from './window-opening.js';

// When a study group meets in a 관정 group study room, picked from everyone's day, for an app that draws answers.

const DEFAULT_MINUTES = 180;
const PERIOD_DAYS_MAX = 7;
const BOOKER = '나';

const input = z.object({
  friendIds: z
    .array(z.uuid())
    .min(1)
    .max(20)
    .describe('The Friends to study with, by the ids resolveFriend returned in this message.'),
  date: dateInput.optional().describe('The one day the User named, as YYYY-MM-DD.'),
  from: dateInput.optional().describe('The first day of a period the User named, such as 이번 주 (today to Sunday).'),
  to: dateInput.optional().describe("The period's last day."),
  minutes: z
    .int()
    .min(1)
    .max(1440)
    .optional()
    .describe('How long, in minutes, only when the User said a length: 2시간 is 120.'),
});

type Asked = z.output<typeof input>;

const DESCRIPTION =
  "Picks when a study group meets in a 관정 group study room and shows the room's book card, which books nothing until the User presses its button. Give the Friends, the one day the User named as date or the period as from and to (neither for the days a room can be booked now), and minutes only when the User said a length (3 hours otherwise). The server picks the room for the number of people and the start at which nobody is left out and the shortest stay is longest. Answers 'shown' with the pick, each person's arrival and stay, and the best time of each other day; 'none' when no time leaves nobody out; or 'refused' with the reasons. A day after the booking window gives a card that gathers the consents first.";

// The days asked: the one named, the period's from today on, or the days a room can be booked now.
function daysOf(space: LibrarySpace, { date, from, to }: Asked, now: Date): string[] | Refusal {
  const today = koreaDate(now);
  if (date !== undefined) {
    return [date];
  }
  if (from === undefined && to === undefined) {
    return Array.from({ length: space.bookingAheadDays + 1 }, (_, index) => addDays(today, index));
  }
  const first = from ?? today;
  const last = to ?? first;
  const days: string[] = [];
  for (let day = first > today ? first : today; day <= last && days.length <= PERIOD_DAYS_MAX; day = addDays(day, 1)) {
    days.push(day);
  }
  if (last < first || days.length > PERIOD_DAYS_MAX) {
    return { field: 'to', reason: `기간은 ${PERIOD_DAYS_MAX}일 안으로 정해 주세요`, bound: PERIOD_DAYS_MAX };
  }
  return days.length === 0 ? [first] : days;
}

// The days that can be booked or waited for; the first day's refusal when none can.
function openDays(space: LibrarySpace, days: readonly string[], now: Date): string[] | Refusal {
  const open = days.filter((day) => windowRefusal(space, day, now, true) === null);
  const [first = ''] = days;
  return open.length > 0
    ? open
    : (windowRefusal(space, first, now, true) ?? { field: 'date', reason: '날짜를 알려 주세요' });
}

// The days to pick from and the length, or why they cannot be booked.
function whenAsked(
  space: LibrarySpace,
  asked: Asked,
  now: Date,
): { dates: string[]; length: number } | { refusals: Refusal[] } {
  const length = asked.minutes ?? Math.min(DEFAULT_MINUTES, space.maxMinutes);
  const duration = durationRefusal(space, length);
  const days = daysOf(space, asked, now);
  const dates = Array.isArray(days) ? openDays(space, days, now) : days;
  if (duration !== null || !Array.isArray(dates)) {
    return { refusals: [...(Array.isArray(dates) ? [] : [dates]), ...(duration === null ? [] : [duration])] };
  }
  return { dates, length };
}

async function companionsOf(
  { friends }: LibraryServices,
  friendIds: readonly string[],
  context: ToolContext,
): Promise<LibraryCompanion[]> {
  const ids = [...new Set(friendIds)];
  context.found.refuseUnfound('friend', ids);
  const names = new Map((await friends.list(context.userId)).map(({ id, name }) => [id, name]));
  return ids.flatMap((id) => {
    const name = names.get(id);
    return name === undefined ? [] : [{ friendId: id, name }];
  });
}

// Each person's items of each day, read as a Plan reads them, and the walks to and from 관정관.
async function studyFacts(
  { arrival: { days, places, travel } }: LibraryServices,
  space: LibrarySpace & { hours: NonNullable<LibrarySpace['hours']> },
  people: readonly string[],
  dates: readonly string[],
  lengthMinutes: number,
  now: Date,
): Promise<StudyFacts> {
  const itemsOf = await Promise.all(
    people.map(async (id) =>
      Object.fromEntries(await Promise.all(dates.map(async (date) => [date, await days.itemsOn(id, date)] as const))),
    ),
  );
  const kwanjeong = places.numbered(KWANJEONG_PLACE_NUMBER)?.id ?? null;
  return {
    people: people.map((id, index) => ({ id, itemsByDate: itemsOf[index] ?? {} })),
    dates,
    hours: space.hours,
    stepMinutes: space.stepMinutes,
    lengthMinutes,
    kwanjeongPlaceId: kwanjeong ?? '',
    walkingMinutes: (from, to) => (kwanjeong === null ? 0 : shownMinutes(travel.walkingSeconds(from, to))),
    earliest: now,
  };
}

function otherDaysOf(others: readonly StudyDatePick[]): object {
  return {
    otherDays: others.flatMap(({ booking }) =>
      booking === null
        ? []
        : [{ date: booking.date, start: booking.start, end: booking.end, shortestMinutes: booking.shortestMinutes }],
    ),
    noBookingOn: others.flatMap(({ date, booking }) => (booking === null ? [date] : [])),
  };
}

interface Shown {
  space: LibrarySpace;
  booking: StudyBooking;
  facts: StudyFacts;
  companions: LibraryCompanion[];
  // When the window opens for the date, for a pick after it.
  opens: Date | null;
}

// "11월 20일 09:00".
const openingWords = (opens: Date): string => `${monthDayWords(koreaDate(opens))} ${clockOf(opens)}`;

const namesOf = (companions: readonly LibraryCompanion[]): string[] => [BOOKER, ...companions.map(({ name }) => name)];

// Each person by name, the User as 나 and a Friend's name as others' text, with when they arrive and their stay.
function shownAnswer({ space, booking, facts, companions, opens }: Shown, others: readonly StudyDatePick[]): object {
  const names = [BOOKER, ...companions.map(({ name }) => othersText('friend.name', name))];
  const arrivals = arrivalsOf(facts, booking);
  const when = `${booking.date}(${weekdayWord(booking.date)}) ${booking.start}–${booking.end}`;
  const closing =
    opens === null
      ? `예약하기를 눌러야 예약돼요. ${SIGN_IN_FIRST}`
      : `예약 창은 ${openingWords(opens)}에 열려요. 동의를 먼저 받아 두고, 그때 알려 드려요.`;
  return {
    result: 'shown',
    summary: `${when} ${roomLabelOf(space, space.id)}, ${names.length}명 예약을 아래에 띄웠어요. ${closing}`,
    people: booking.stays.map(({ from, until, minutes }, index) => ({
      name: names[index] ?? '',
      arrival: arrivals[index] ?? null,
      from,
      until,
      minutes,
    })),
    ...(opens === null ? {} : { windowOpens: koreaDate(opens) }),
    ...otherDaysOf(others),
  };
}

function cardNotes({ booking, facts, companions, opens }: Shown): string[] {
  const names = namesOf(companions);
  const arrivals = arrivalsOf(facts, booking);
  const waiting =
    opens === null ? [] : [`예약 창이 열리는 ${openingWords(opens)}에 알려 드려요. 동의는 먼저 받아 둬요`];
  return [
    ...waiting,
    ...booking.stays.map((stay, index) => stayNote(names[index] ?? '', arrivals[index] ?? null, stay, booking)),
  ];
}

// Picks the study group's time and shows the room's book card for the best pick.
export function proposeStudyRoom(services: LibraryServices): Tool {
  return defineTool({
    description: DESCRIPTION,
    input,
    run: async (asked, context) => {
      const blocked = gated(services, context);
      if (blocked !== null) {
        return blocked;
      }
      const companions = await companionsOf(services, asked.friendIds, context);
      const people = 1 + companions.length;
      const room = studyRoomFor(services.catalogue, people);
      if ('refusal' in room) {
        return refused([room.refusal]);
      }
      const { space } = room;
      const { hours } = space;
      const when = whenAsked(space, asked, context.now);
      if (hours === null || 'refusals' in when) {
        return refused('refusals' in when ? when.refusals : []);
      }
      const { dates, length } = when;
      const ids = [context.userId, ...companions.map(({ friendId }) => friendId)];
      const facts = await studyFacts(services, { ...space, hours }, ids, dates, length, context.now);
      const [first, ...others] = pickStudyTime(facts);
      const booking = first?.booking ?? null;
      if (booking === null) {
        return { ...noneFound('그 기간에는 모두가 30분 이상 함께 있을 수 있는 시간이 없어요.'), days: dates };
      }
      const waits = booking.date > lastBookableDate(space, context.now);
      const request = { date: booking.date, start: booking.start, minutes: length, people };
      const checked = checkBooking(services.catalogue, space, request, context.now, waits);
      if ('refusals' in checked) {
        return refused(checked.refusals);
      }
      const shown = { space, booking, facts, companions, opens: waits ? windowOpening(space, booking.date) : null };
      showCard(
        context.presented,
        bookCard(space, {
          ...checked.booking,
          companions,
          questId: null,
          notes: cardNotes(shown),
          waitsForWindow: waits,
        }),
      );
      return shownAnswer(shown, others);
    },
  });
}
