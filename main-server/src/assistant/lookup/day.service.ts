/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { type KeptQuest, keptQuestsOf } from '../../quests/kept-quests.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { clockOf } from '../free-time/free-time.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { othersText } from '../others-text.js';
import { dayAnswer, type DayAnswer } from './day-lookup.js';

// The most items the line of what is ahead gives the model each turn, and the days it looks at, today included.
const AHEAD_MAX = 6;
const AHEAD_DAYS = 7;

// The day of a time not today, "11/04 ", before its clock; nothing for today.
const dayOf = (at: Date, now: Date): string => {
  const date = koreaDate(at);
  return date === koreaDate(now) ? '' : `${date.slice(5, 7)}/${date.slice(8, 10)} `;
};

// A Quest in the line: its time, kind, title, place, ref (its id's first 8 characters, which the tools take), whether
// the User leads it, and the others with their answers.
function aheadWords({ start, end, kind, title, questId, mine, people }: KeptQuest, place: string): string {
  const span = end === null ? clockOf(start) : `${clockOf(start)}–${clockOf(end)}`;
  const others = people.map(({ name, answer }) => `${othersText('friend.name', name)} ${answer}`);
  const facts = [`ref ${questId.slice(0, 8)}`, ...(mine ? ['mine'] : []), ...others];
  return `${span} ${kind} ${othersText('quest.title', title)} at ${place} (${facts.join(', ')})`;
}

// What a day drawn on the map needs that the server reads itself: the User's Classes and Quests, and the Places.
@Injectable()
export class DayLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  // `asked`: the Quests asked for, by their ids or the first 8 characters of them.
  async find(userId: string, date: string, now: Date, asked?: readonly string[]): Promise<DayAnswer> {
    const [items, kept] = await Promise.all([
      this.days.itemsOn(userId, date),
      keptQuestsOf(this.prisma, userId, { date, now }),
    ]);
    return dayAnswer({
      date,
      now,
      me: { userId, items },
      travel: this.travel,
      placeOf: (placeId) => this.placeOf(placeId),
      kept,
      ...(asked === undefined ? {} : { asked }),
    });
  }

  // What is ahead, at most AHEAD_MAX items in order, as one line the model reads after the User's message, so that it
  // knows the User's schedule without being asked: today's Classes still to come, and the User's Quests of today and
  // the next AHEAD_DAYS - 1 days. Empty when nothing is.
  async ahead(userId: string, now: Date): Promise<string[]> {
    const date = koreaDate(now);
    const [items, kept] = await Promise.all([
      this.days.itemsOn(userId, date),
      keptQuestsOf(this.prisma, userId, { date, now, days: AHEAD_DAYS }),
    ]);
    const label = (placeId: string | null, words: string | null = null): string => {
      const place = placeId === null ? null : this.places.byId(placeId);
      return othersText('quest.place', place === null ? (words ?? '-') : placeLabelOf(place));
    };
    const entries = [
      ...items
        .filter(({ isClass, end }) => isClass && end > now)
        .map(({ start, end, placeId }) => ({
          start,
          words: `${dayOf(start, now)}${clockOf(start)}–${clockOf(end)} class ${label(placeId)}`,
        })),
      ...kept
        .filter(({ start, end }) => (end ?? start) > now)
        .map((quest) => ({
          start: quest.start,
          words: `${dayOf(quest.start, now)}${aheadWords(quest, label(quest.placeId, quest.placeLabel))}`,
        })),
    ].toSorted((one, other) => one.start.getTime() - other.start.getTime());
    const shown = entries.slice(0, AHEAD_MAX).map(({ words }) => words);
    return shown.length === 0 ? [] : [`[Ahead: ${shown.join('; ')}]`];
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
