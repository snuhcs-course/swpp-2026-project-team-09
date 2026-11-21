/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { defineTool, type Tool, type ToolContext } from '../feature.js';
import { koreaDate } from '../korea-time.js';
import { shownMinutes } from '../../travel/travel.js';
import { clockTime, dateInput } from '../free-time/tool-parts.js';
import { checkBooking, type CheckedBooking, clockOfMinutes, minutesOfClock, type Refusal } from './booking-rules.js';
import { KWANJEONG_PLACE_NUMBER, type LibrarySpace } from './catalogue.js';
import { firstOfSeveralNote } from './find-library-space.js';
import { bookCard, type LibraryCompanion } from './library-card.js';
import {
  bookableSpace,
  dayWords,
  type LibraryServices,
  refused,
  showCard,
  SIGN_IN_FIRST,
  spaceIdInput,
} from './library-parts.js';
import { fillSeat, filledWords, leaveByOf, type SeatFacts, type SeatFill, seatedAt } from './seat-arrival.js';

const words = (max: number): z.ZodString => z.string().trim().min(1).max(max);

const input = z.object({
  spaceId: spaceIdInput,
  date: dateInput,
  start: clockTime.optional().describe('When it starts, as HH:MM. Leave it out when the User gave no time.'),
  minutes: z.int().min(1).max(1440).optional().describe('How long, in minutes: 2시간 is 120.'),
  end: clockTime.optional().describe('When it ends, as HH:MM, for "~까지", instead of minutes.'),
  seat: words(20).optional().describe('A seat or room the User named: 7193, G405, STUDIO A.'),
  equipment: words(40)
    .optional()
    .describe("An equipment group's id from findLibrarySpace, when the User asked for that equipment."),
  useDesc: words(20)
    .optional()
    .describe("The 사용용도, one of the space's useDescOptions, only when the User said the purpose."),
  friendIds: z
    .array(z.uuid())
    .max(20)
    .optional()
    .describe('The companions, by the ids resolveFriend returned in this message.'),
  questId: z.uuid().optional().describe('A 파티 the User holds, whose Holders are the companions.'),
});

// The input of an app that draws answers.
const answeringInput = input.extend({
  askedToBook: z
    .boolean()
    .optional()
    .describe(
      'true when the User asks you to make the booking yourself, such as "그냥 예약해 줘" or "예약까지 해 줘": you cannot, and the card says that the User presses 예약하기.',
    ),
});

// The card's first note when the User asked the Assistant to book.
const OWN_PRESS_NOTE = '예약은 직접 눌러 주세요';

interface Party {
  people: number;
  companions: LibraryCompanion[];
  questId: string | null;
}

// The companions of a booking: Friends resolveFriend returned in this message, or the other Holders of a Quest the User
// holds. Each by id and name only.
async function partyOf(
  { friends, quests }: LibraryServices,
  { friendIds = [], questId }: z.output<typeof input>,
  context: ToolContext,
): Promise<Party | { refusal: Refusal }> {
  if (questId !== undefined && friendIds.length > 0) {
    return { refusal: { field: 'questId', reason: '함께할 사람은 친구나 파티 중 하나로 정해 주세요' } };
  }
  if (questId !== undefined) {
    try {
      const quest = await quests.read(context.userId, questId);
      return { people: quest.holders.length, companions: [], questId };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { refusal: { field: 'questId', reason: '내가 참여 중인 파티 중에 그런 파티가 없어요' } };
      }
      throw error;
    }
  }
  const ids = [...new Set(friendIds)];
  context.found.refuseUnfound('friend', ids);
  const names = new Map((await friends.list(context.userId)).map(({ id, name }) => [id, name]));
  const companions = ids.flatMap((id) => {
    const name = names.get(id);
    return name === undefined ? [] : [{ friendId: id, name }];
  });
  return { people: 1 + companions.length, companions, questId: null };
}

// The summary in words, with no live data.
function summaryOf(
  space: LibrarySpace,
  booking: CheckedBooking,
  party: Party,
  now: Date,
  { filled = '', askedToBook = false }: { filled?: string; askedToBook?: boolean | undefined } = {},
): string {
  const end = clockOfMinutes(minutesOfClock(booking.start) + booking.minutes);
  const where = `${space.floor}층 ${space.name}${booking.seat === null ? '' : ` ${booking.seat}`}`;
  const who = party.people > 1 ? `, ${party.people}명` : '';
  const asks = space.unit === 'room' && booking.useDesc === null ? ' 사용 용도는 카드에서 골라요.' : '';
  const when = `${dayWords(booking.date, now)} ${booking.start}–${end}`;
  const press = askedToBook
    ? `대신 예약할 수는 없어요. 예약하기를 직접 눌러야 예약돼요. ${SIGN_IN_FIRST}`
    : `예약하기를 눌러야 예약돼요. ${SIGN_IN_FIRST}`;
  return `${where}, ${when}${who} 예약 카드를 보여 줬어요. ${filled}${press}${asks}`;
}

const DESCRIPTION =
  "Checks a 관정도서관 booking and shows a book card, which books nothing until the User presses 예약하기 on it. Give the space's id from findLibrarySpace, the day, start, and minutes or end, as the User said them, and only what they said of the seat, the room's equipment, the 사용용도 and companions. Answers 'shown' with a summary; 'refused' with every refusal at once, each with its reason and bound; or the space's status with its reason.";

const FILLING_DESCRIPTION = `${DESCRIPTION} A seat for today without start is filled from when the User arrives at 관정관, and 'shown' then also gives the arrival and leaveBy, when to leave for what follows.`;

export interface BookingOptions {
  // The app draws answers on the map: a seat for today without a start gets its time from the User's arrival.
  fillsSeatTime: boolean;
  // The app draws answers on the map: a card the User asked the Assistant to book says it is their own press.
  notesOwnPress?: boolean;
}

// What a seat's arrival is read from.
async function seatFacts(
  { days, places, travel }: LibraryServices['arrival'],
  context: ToolContext,
): Promise<SeatFacts> {
  const date = koreaDate(context.now);
  const { location } = context.context;
  return {
    date,
    now: context.now,
    items: await days.itemsOn(context.userId, date),
    locationPlaceId: location === null ? null : (places.at(location)?.place.id ?? null),
    kwanjeongPlaceId: places.numbered(KWANJEONG_PLACE_NUMBER)?.id ?? null,
    walkingMinutes: (from, to) => shownMinutes(travel.walkingSeconds(from, to)),
  };
}

interface Filling {
  facts: SeatFacts;
  fill: SeatFill;
}

// An arrival before the opening is given as the opening, so that no answer sends the User out at night.
function arrivalAnswer(fill: SeatFill, { arrival: { places } }: LibraryServices): object {
  const { fromPlaceId, walkMinutes } = fill.arrival;
  return {
    at: seatedAt(fill),
    from: fromPlaceId === null ? null : (places.byId(fromPlaceId)?.name ?? null),
    walkMinutes,
  };
}

// A seat for today without a start is filled; anything else is checked as asked.
async function fillingOf(
  services: LibraryServices,
  context: ToolContext,
  space: LibrarySpace,
  asked: z.output<typeof input>,
): Promise<Filling | null> {
  const { hours } = space;
  if (space.unit !== 'seat' || hours === null || asked.start !== undefined || asked.date !== koreaDate(context.now)) {
    return null;
  }
  const facts = await seatFacts(services.arrival, context);
  return { facts, fill: fillSeat(facts, { ...space, hours }, asked) };
}

interface Checked {
  space: LibrarySpace;
  booking: CheckedBooking;
  party: Party;
  filling: Filling | null;
  askedToBook: boolean | undefined;
}

// Shows the book card of a booking that passed, and answers its summary, with the arrival of a filled seat.
function shownBooking(services: LibraryServices, context: ToolContext, checked: Checked): object {
  const { space, booking, party, filling, askedToBook } = checked;
  showCard(
    context.presented,
    bookCard(space, {
      ...booking,
      companions: party.companions,
      questId: party.questId,
      notes: [
        ...(askedToBook === true ? [OWN_PRESS_NOTE] : []),
        ...(filling === null ? [] : [filling.fill.note]),
        ...firstOfSeveralNote(context, space.id),
      ],
    }),
  );
  if (filling === null) {
    return { result: 'shown', summary: summaryOf(space, booking, party, context.now, { askedToBook }) };
  }
  const end = clockOfMinutes(minutesOfClock(booking.start) + booking.minutes);
  const leaveBy = leaveByOf(filling.facts, filling.fill.arrival.at, end);
  const filled = filledWords(filling.fill, leaveBy, end);
  return {
    result: 'shown',
    summary: summaryOf(space, booking, party, context.now, { filled, askedToBook }),
    arrival: arrivalAnswer(filling.fill, services),
    leaveBy,
  };
}

// Checks a booking against the catalogue, every refusal at once, and shows a book card when nothing is refused.
export function proposeLibraryBooking(services: LibraryServices, options?: BookingOptions): Tool {
  const fillsSeatTime = options?.fillsSeatTime ?? false;
  const description = fillsSeatTime ? FILLING_DESCRIPTION : DESCRIPTION;
  const run = async (asked: z.output<typeof answeringInput>, context: ToolContext): Promise<unknown> => {
    const checked = await bookableSpace(services, asked.spaceId, context);
    if ('answer' in checked) {
      return checked.answer;
    }
    const { space } = checked;
    const party = await partyOf(services, asked, context);
    const people = 'refusal' in party ? undefined : party.people;
    const filling = fillsSeatTime ? await fillingOf(services, context, space, asked) : null;
    const request =
      filling === null
        ? asked
        : { ...asked, start: filling.fill.start, minutes: filling.fill.minutes, end: filling.fill.end };
    const result = checkBooking(services.catalogue, space, { ...request, people }, context.now);
    if ('refusal' in party || 'refusals' in result) {
      return refused([
        ...('refusal' in party ? [party.refusal] : []),
        ...('refusals' in result ? result.refusals : []),
      ]);
    }
    const { booking } = result;
    return shownBooking(services, context, { space, booking, party, filling, askedToBook: asked.askedToBook });
  };
  // The text chat's input stays as it was; only an app that draws answers is told of askedToBook.
  return options?.notesOwnPress === true
    ? defineTool({ description, input: answeringInput, run })
    : defineTool({ description, input, run });
}
