/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { shownMinutes } from '../../travel/travel.js';
import { type ToolContext } from '../feature.js';
import { type DayItem } from '../free-time/free-time.js';
import { skipOf, skippedOut, skippedWords, type SkipWords, type UnknownClass } from '../free-time/left-out-classes.js';
import { koreaDate } from '../korea-time.js';
import { KWANJEONG_PLACE_NUMBER, type LibrarySpace } from './catalogue.js';
import { type LibraryServices } from './library-parts.js';
import { fillSeat, type NamedLength, type SeatFacts, type SeatFill } from './seat-arrival.js';

// A seat for today without a start, filled from when the User arrives at 관정관 (proposeLibraryBooking), from the User's
// day without the Classes the conversation leaves out (P05 ticket 70).

export interface Filling {
  facts: SeatFacts;
  fill: SeatFill;
}

// What the seat asked: its day, start and length, and the Classes named to leave out or to go to.
type SeatAsked = NamedLength & SkipWords & { date: string; start?: string | undefined };

// What a seat's arrival is read from: the User's day without the Classes left out.
async function seatFacts(
  { days, places, travel }: LibraryServices['arrival'],
  context: ToolContext,
  skipped: readonly string[],
): Promise<SeatFacts> {
  const date = koreaDate(context.now);
  const { location } = context.context;
  return {
    date,
    now: context.now,
    items: skippedOut(await days.itemsOn(context.userId, date), skipped).items,
    locationPlaceId: location === null ? null : (places.at(location)?.place.id ?? null),
    kwanjeongPlaceId: places.numbered(KWANJEONG_PLACE_NUMBER)?.id ?? null,
    walkingMinutes: (from, to) => shownMinutes(travel.walkingSeconds(from, to)),
  };
}

// A seat for today without a start is filled; anything else is checked as asked.
async function fillingOf(
  services: LibraryServices,
  context: ToolContext,
  space: LibrarySpace,
  asked: SeatAsked,
  skipped: readonly string[],
): Promise<Filling | null> {
  const { hours } = space;
  if (space.unit !== 'seat' || hours === null || asked.start !== undefined || asked.date !== koreaDate(context.now)) {
    return null;
  }
  const facts = await seatFacts(services.arrival, context, skipped);
  return { facts, fill: fillSeat(facts, { ...space, hours }, asked) };
}

// A seat for today without a start, filled from the day without the Classes the conversation keeps and those named now,
// and the words of the Classes it leaves out; no filling for anything else, or for an app that does not draw answers;
// or the question of which Class a word means.
export async function filledSeat(
  services: LibraryServices,
  context: ToolContext,
  space: LibrarySpace,
  asked: SeatAsked,
  fills: boolean,
): Promise<{ filling: Filling | null; said: { skipped?: string[] } } | UnknownClass> {
  if (!fills) {
    return { filling: null, said: {} };
  }
  const { userId, presented } = context;
  const classesOn = (askerId: string, date: string): Promise<DayItem[]> =>
    services.arrival.days.classesOn(askerId, date);
  const skip = await skipOf(classesOn, { userId, date: asked.date, context: context.context, presented }, asked);
  if ('result' in skip) {
    return skip;
  }
  const filling = await fillingOf(services, context, space, asked, skip.ids);
  return { filling, said: filling === null ? {} : skippedWords(skip.ids, skip.classes) };
}
