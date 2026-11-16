/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { QuestsService } from '../../quests/quests.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type AnswerReply, type NewQuestInput } from '../dto/answer.dto.js';
import { dateOf, onDay } from '../free-time/free-time.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { type AnswerPerson } from '../gathering/answer-words.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';
import { newQuestAnswer } from './new-quest-answer.js';
import { fitNewQuest, type NewQuestPlanning } from './new-quest-fit.js';

// Where a new recruiting Quest meets, what it and its Place are called, and its Global Event's times.
interface Where {
  placeId: string;
  placeWords: string;
  title: string;
  event: { start: Date; end: Date | null } | null;
}

const refused = (message: string): BadRequestException => new BadRequestException(message);

// The one place that gathers what an answer of a new recruiting Quest needs: the Global Event or the Place, the people
// of the plan and the asker's other Friends with their days, for the tool, the recalculation, and the making alike.
@Injectable()
export class NewQuestPlanService {
  constructor(
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly friends: FriendViewService,
    private readonly globalEvents: GlobalEventsService,
    private readonly quests: QuestsService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async plan(
    askerId: string,
    input: NewQuestInput,
    at: { now: Date; location: Position | null },
  ): Promise<AnswerReply> {
    return (await this.planned(askerId, input, at)).answer;
  }

  // The answer, and the calculation it words. Refuses a Global Event that is not published at a Place, a Place not in
  // the list, an activity with no time said on a day other than today, and people as a meal's plan refuses them.
  async planned(
    askerId: string,
    input: NewQuestInput,
    at: { now: Date; location: Position | null },
  ): Promise<{ answer: AnswerReply; planning: NewQuestPlanning }> {
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const { date, time } = input;
    const where = await this.whereOf(input);
    if (time === null && where.event === null && date !== koreaDate(now)) {
      throw refused('A new Quest on another day needs a time');
    }
    const { people, others } = await this.peopleOf(askerId, input);
    const [asker] = people;
    if (asker === undefined) {
      throw refused('A plan has its asker');
    }
    const locationPlaceId = at.location === null ? null : (this.places.at(at.location)?.place.id ?? null);
    const friends = people.slice(1).map(({ userId, items }) => ({ userId, items, locationPlaceId: null }));
    const planning = fitNewQuest(
      {
        date,
        now,
        placeId: where.placeId,
        event: where.event,
        time: time === null ? null : onDay(date, time),
        people: [{ userId: askerId, items: asker.items, locationPlaceId }, ...friends],
        others,
      },
      this.travel,
    );
    const answer = newQuestAnswer({
      input,
      now,
      asker: { ...asker, position: at.location },
      people,
      others,
      planning,
      title: where.title,
      placeId: where.placeId,
      placeWords: where.placeWords,
      event: where.event,
      placeOf: (placeId) => this.placeOf(placeId),
    });
    return { answer, planning };
  }

  private async whereOf({ globalEventId, title, placeId }: NewQuestInput): Promise<Where> {
    if (globalEventId === null) {
      const place = placeId === null ? null : this.places.byId(placeId);
      if (place === null || title === null) {
        throw refused('No such Place');
      }
      return { placeId: place.id, placeWords: place.name, title, event: null };
    }
    const [event] = await this.globalEvents.publishedAmong([globalEventId]);
    const start = dateOf(event?.startsAt ?? null);
    const eventPlaceId =
      event === undefined
        ? null
        : this.places.placeIdOf({
            placeId: null,
            label: event.place ?? '',
            latitude: event.latitude,
            longitude: event.longitude,
          });
    if (event === undefined || start === null || eventPlaceId === null) {
      throw refused('No such Global Event is published at a Place');
    }
    const words = event.place ?? this.placeOf(eventPlaceId).name;
    return {
      placeId: eventPlaceId,
      placeWords: words,
      title: event.title,
      event: { start, end: dateOf(event.endsAt) },
    };
  }

  // The plan's people, the asker first, each the asker's Friend and once, and the asker's other Friends who hold no
  // Quest for the Global Event, each with their day.
  private async peopleOf(
    askerId: string,
    { people, date, globalEventId }: NewQuestInput,
  ): Promise<{ people: AnswerPerson[]; others: AnswerPerson[] }> {
    const ids = people.map(({ userId }) => userId);
    const [asker, friends, holders] = await Promise.all([
      this.users.findById(askerId),
      this.friends.list(askerId),
      globalEventId === null ? Promise.resolve<string[]>([]) : this.quests.holderIdsFor(globalEventId),
    ]);
    if (ids[0] !== askerId || new Set(ids).size < ids.length) {
      throw refused('A plan starts with the asker and holds each person once');
    }
    if (ids.slice(1).some((id) => !friends.some((friend) => friend.id === id))) {
      throw refused("Only the asker's Friends can be in a plan");
    }
    const named: Pick<FriendView, 'id' | 'name'>[] = [{ id: askerId, name: asker.name }, ...friends];
    const dayOf = async (userId: string): Promise<AnswerPerson> => ({
      userId,
      name: named.find(({ id }) => id === userId)?.name ?? '',
      me: userId === askerId,
      items: await this.days.itemsOn(userId, date),
      position: null,
    });
    const otherIds = friends.map(({ id }) => id).filter((id) => !ids.includes(id) && !holders.includes(id));
    return {
      people: await Promise.all(ids.map((id) => dayOf(id))),
      others: await Promise.all(otherIds.map((id) => dayOf(id))),
    };
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
