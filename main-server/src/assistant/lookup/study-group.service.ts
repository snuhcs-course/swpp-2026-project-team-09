/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { type FriendView } from '../../friends/dto/friend-view.dto.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { type AnswerReply, type PersonConstraint, type PlacePoint, type StudyInput } from '../dto/answer.dto.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { type OtherFriend } from '../gathering/answer-words.js';
import { walkingMinutes } from '../gathering/gathering-travel.js';
import { MealPlanService } from '../gathering/meal-plan.service.js';
import { locationPlaceOf, otherFriendsOf } from '../gathering/other-friends.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { type Catalogue, KWANJEONG_PLACE_NUMBER, LIBRARY_CATALOGUE } from '../library/catalogue.js';
import { type StudyDatePick } from '../library/study-pick.js';
import { groupRooms } from '../library/study-room.js';
import { type GroupPerson, type GroupTime, studyGroupTime } from './study-group.js';
import { lockedGroupTime, type SentRoom } from './study-group-locked.js';
import { type SetOut, studyGroupAnswer } from './study-group-parts.js';
import { KWANJEONG_BUILDING } from './study-plan-parts.js';

const nameOf = (named: FriendView | string | undefined): string =>
  typeof named === 'string' ? named : (named?.name ?? '');

// What a study answer together reads (P10 ticket 07): the people checked as a meal's are (the asker first, only their
// Friends, no one twice, constraints the asker's, known Places), everyone's items of the days asked, where each sets
// out from, the asker's other Friends for the time card, and the 관정 catalogue's group study rooms.
@Injectable()
export class StudyGroupService {
  constructor(
    private readonly meals: MealPlanService,
    private readonly friendViews: FriendViewService,
    private readonly days: UserDayService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    @Inject(LIBRARY_CATALOGUE) private readonly catalogue: Catalogue,
  ) {}

  // How many days after today a group study room can be booked.
  aheadDays(): number {
    return groupRooms(this.catalogue)[0]?.bookingAheadDays ?? 0;
  }

  // The answer on the best of `dates` (the input's date unless a period is asked), and the other days' best.
  async plan(
    askerId: string,
    input: StudyInput,
    at: { now: Date; location: Position | null },
    dates: readonly string[] = [input.date],
  ): Promise<{ answer: AnswerReply; otherDays: StudyDatePick[] }> {
    const { friends, others } = await this.meals.friendsOf(askerId, { people: input.people, placeId: null });
    const kwanjeong = this.kwanjeong();
    const people = await this.peopleOf(input, friends, dates);
    const time = studyGroupTime({
      input,
      dates,
      now: at.now,
      catalogue: this.catalogue,
      people,
      kwanjeongPlaceId: kwanjeong.id,
      walkingMinutes: this.walking,
    });
    const answer = await this.answerOf(time, { input, people, friends, others, kwanjeong }, at);
    return { answer, otherDays: time.kind === 'pick' ? time.pick.others : [] };
  }

  // The answer of a sent room request (P10 ticket 08), locked at its room and time, for its people whoever they are to
  // the asker: a Quest's other Holders need not be Friends. `names` are the companions' names, in the input's order.
  async locked(
    askerId: string,
    input: StudyInput,
    sent: SentRoom & { names: string[] },
    now: Date,
  ): Promise<AnswerReply> {
    const listed = await this.friendViews.list(askerId);
    const known = {
      ...input,
      people: input.people.map((person) => ({ ...person, constraints: person.constraints.filter(this.knows) })),
    };
    const ids = new Set(input.people.map(({ userId }) => userId));
    const friends = input.people.slice(1).map(({ userId }) => listed.find(({ id }) => id === userId));
    const kwanjeong = this.kwanjeong();
    // Only the asker's and their Friends' days are read: a Holder who is not a Friend shows no Class, no building and no
    // origin, and stays for the whole booking.
    const reads = (userId: string): boolean => userId === askerId || listed.some(({ id }) => id === userId);
    const people = await this.peopleOf(known, sent.names, [input.date], reads);
    const args = { input: known, dates: [input.date], now, catalogue: this.catalogue, people };
    const time = lockedGroupTime({ ...args, kwanjeongPlaceId: kwanjeong.id, walkingMinutes: this.walking }, sent);
    const others = listed.filter(({ id }) => !ids.has(id));
    return this.answerOf(time, { input: known, people, friends, others, kwanjeong }, { now, location: null });
  }

  // The asker's Friends with their day, for the time card of the answer alone.
  async othersOf(askerId: string, input: StudyInput): Promise<OtherFriend[]> {
    const { others } = await this.meals.friendsOf(askerId, { people: input.people, placeId: null });
    return otherFriendsOf(others, input.date, { days: this.days, travel: this.travel });
  }

  private readonly walking = (from: string, to: string): number => walkingMinutes(from, to, this.travel);

  // A constraint whose Place is known: a kept input may name one the seed no longer has.
  private readonly knows = (constraint: PersonConstraint): boolean =>
    constraint.kind !== 'from' || this.places.byId(constraint.placeId) !== null;

  private kwanjeong(): PlaceDto {
    const kwanjeong = this.places.numbered(KWANJEONG_PLACE_NUMBER);
    if (kwanjeong === null) {
      throw new Error(`No Place ${KWANJEONG_PLACE_NUMBER}`);
    }
    return kwanjeong;
  }

  // The one plan of the time picked, each person setting out as setOutOf says, with the asker's other Friends.
  private async answerOf(
    time: GroupTime,
    of: {
      input: StudyInput;
      people: GroupPerson[];
      friends: readonly (FriendView | undefined)[];
      others: readonly FriendView[];
      kwanjeong: PlaceDto;
    },
    at: { now: Date; location: Position | null },
  ): Promise<AnswerReply> {
    const { input, people, friends, kwanjeong } = of;
    const date = time.kind === 'pick' ? time.pick.booking.date : input.date;
    return studyGroupAnswer({
      time,
      input,
      now: at.now,
      people,
      setOut: this.setOutOf(input, friends, date, at),
      others: await otherFriendsOf(of.others, date, { days: this.days, travel: this.travel }),
      kwanjeong: { ...this.pointOf(kwanjeong), label: `${KWANJEONG_BUILDING}(${kwanjeong.number ?? ''}동)` },
      walkingMinutes: this.walking,
      placePoint: (placeId) => this.pointOf(this.placeOf(placeId)),
      placeLabel: (placeId) => placeLabelOf(this.placeOf(placeId)),
      hours: groupRooms(this.catalogue)[0]?.hours ?? null,
    });
  }

  // Each person's items of the days, named by their Friend view or the names given, the asker 나; none for one whose day
  // is not read.
  private async peopleOf(
    input: StudyInput,
    named: readonly (FriendView | string)[],
    dates: readonly string[],
    reads: (userId: string) => boolean = () => true,
  ): Promise<GroupPerson[]> {
    const days = await Promise.all(
      input.people.map(async ({ userId }) =>
        reads(userId)
          ? Object.fromEntries(
              await Promise.all(dates.map(async (date) => [date, await this.days.itemsOn(userId, date)] as const)),
            )
          : {},
      ),
    );
    return input.people.map(({ userId, constraints }, index) => ({
      userId,
      name: index === 0 ? '나' : nameOf(named[index - 1]),
      me: index === 0,
      itemsByDate: days[index] ?? {},
      constraints,
    }));
  }

  // Where each sets out from when no item of theirs comes before: the `from` the asker set, else, today, where the asker
  // is and where the Friend view puts a Friend.
  private setOutOf(
    input: StudyInput,
    friends: readonly (FriendView | undefined)[],
    date: string,
    { now, location }: { now: Date; location: Position | null },
  ): Map<string, SetOut> {
    const today = date === koreaDate(now);
    return new Map(
      input.people.flatMap(({ userId, constraints }, index): [string, SetOut][] => {
        const [chosen] = constraints.flatMap((one) => (one.kind === 'from' ? [one.placeId] : []));
        if (chosen !== undefined) {
          return [[userId, { placeId: chosen, basis: 'chosen' }]];
        }
        const located = index === 0 ? this.meals.placeIdAt(location) : locationPlaceOf(friends[index - 1]);
        return today && located !== null ? [[userId, { placeId: located, basis: 'location' }]] : [];
      }),
    );
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }

  private pointOf(place: PlaceDto): PlacePoint {
    const { id, latitude, longitude } = place;
    return { placeId: id, label: placeLabelOf(place), latitude, longitude };
  }
}
