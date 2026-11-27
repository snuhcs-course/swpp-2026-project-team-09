/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 
 * 2026-11-27  Opus 5.5   prompted by fyoon46
******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type AnswerReply, type EventsInput, type LeftOutClass } from '../dto/answer.dto.js';
import { dateOf, type DayItem, endOfDay, startOfDay } from '../free-time/free-time.js';
import { idsOn, skippedOut } from '../free-time/left-out-classes.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { eventAnswer } from './event-answer.js';
import { type DayEvent, type EventPlanning, fitEvents } from './event-fit.js';

interface PlanAt {
  now: Date;
  location: Position | null;
  // The conversation's Classes left out (P05 ticket 70).
  skipped?: readonly LeftOutClass[];
}

// The one place that gathers what an answer of a day's events needs: the asker's day, the day's published Global Events,
// and the Places, for the tool and the recalculation alike.
@Injectable()
export class EventsPlanService {
  constructor(
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly globalEvents: GlobalEventsService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async plan(askerId: string, input: EventsInput, at: PlanAt): Promise<AnswerReply> {
    return (await this.planned(askerId, input, at)).answer;
  }

  // The asker's Classes of the day, among which a tool names a Class to leave out (P05 ticket 70).
  readonly classesOn = (askerId: string, date: string): Promise<DayItem[]> => this.days.classesOn(askerId, date);

  // The answer, and the calculation it words, in the same order. The asker's Classes left out are free.
  async planned(
    askerId: string,
    input: EventsInput,
    at: PlanAt,
  ): Promise<{ answer: AnswerReply; planning: EventPlanning }> {
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, eventIds } = input;
    const [asker, day, published] = await Promise.all([
      this.users.findById(askerId),
      this.days.itemsOn(askerId, date),
      this.globalEvents.searchPublished({ period: { from: startOfDay(date), to: endOfDay(date) } }, now),
    ]);
    const { items, skipped } = skippedOut(day, idsOn(at.skipped ?? [], date));
    const wanted = eventIds === null ? published : published.filter(({ id }) => eventIds.includes(id));
    const planning = fitEvents(
      {
        items,
        date,
        now,
        locationPlaceId: at.location === null ? null : (this.places.at(at.location)?.place.id ?? null),
        events: wanted.flatMap((event) => this.dayEvent(event) ?? []),
      },
      this.travel,
    );
    const answer = eventAnswer({
      input,
      now,
      asker: {
        userId: askerId,
        name: asker.name,
        me: true,
        items,
        ...(skipped === undefined ? {} : { skipped }),
        position: at.location,
      },
      planning,
      placeOf: (placeId) => this.placeOf(placeId),
    });
    return { answer, planning };
  }

  // A published event has a start; the search leaves out any without one.
  private dayEvent({
    id,
    title,
    startsAt,
    endsAt,
    place,
    latitude,
    longitude,
  }: PublishedGlobalEventDto): DayEvent | null {
    const start = dateOf(startsAt);
    if (start === null) {
      return null;
    }
    const placeId = this.places.placeIdOf({ placeId: null, label: place ?? '', latitude, longitude });
    return { id, title, start, end: dateOf(endsAt), placeId, place };
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
