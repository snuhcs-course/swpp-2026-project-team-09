/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { type Position } from '../../common/geometry.js';
import { PrismaService } from '../../common/prisma.service.js';
import { FriendViewService } from '../../friends/friend-view.service.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { PlaceLookup } from '../../places/place-lookup.js';
import {
  QUEST_INCLUDE,
  type RecruitingQuestDto,
  type StoredQuest,
  subQuestContentsOf,
  type SubQuestPlaceDto,
} from '../../quests/dto/quest.dto.js';
import { RecruitingService } from '../../quests/recruiting.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../../travel/travel.js';
import { UsersService } from '../../users/users.service.js';
import { type AnswerReply, type QuestsInput } from '../dto/answer.dto.js';
import { dateOf, type DayItem } from '../free-time/free-time.js';
import { UserDayService } from '../free-time/user-day.service.js';
import { MINUTE_MS } from '../gathering/gathering.js';
import { koreaDate } from '../korea-time.js';
import { questAnswer } from './quest-answer.js';
import {
  type DayQuest,
  fitQuests,
  judgedStep,
  meetingPlaceOf,
  type QuestPlanning,
  type QuestStep,
} from './quest-fit.js';

// The one place that gathers what an answer of recruiting Quests needs: the Quests the recruiting list gives the asker,
// their steps and Holders, the asker's Friends and days, and the Places, for the tool and the recalculation alike.
@Injectable()
export class QuestsPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recruiting: RecruitingService,
    private readonly friends: FriendViewService,
    private readonly days: UserDayService,
    private readonly users: UsersService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
  ) {}

  async plan(askerId: string, input: QuestsInput, at: { now: Date; location: Position | null }): Promise<AnswerReply> {
    return (await this.planned(askerId, input, at)).answer;
  }

  // The answer, and the calculation it words, in the same order.
  async planned(
    askerId: string,
    input: QuestsInput,
    at: { now: Date; location: Position | null },
  ): Promise<{ answer: AnswerReply; planning: QuestPlanning }> {
    const now = new Date(Math.ceil(at.now.getTime() / MINUTE_MS) * MINUTE_MS);
    const [asker, listed] = await Promise.all([this.users.findById(askerId), this.listedFor(askerId, input)]);
    const quests = await this.dayQuests(askerId, listed);
    const dates = [...new Set(quests.flatMap((quest) => judgedStepDate(quest, now) ?? []))];
    const days = new Map<string, DayItem[]>(
      await Promise.all(dates.map(async (date) => [date, await this.days.itemsOn(askerId, date)] as const)),
    );
    const planning = fitQuests(
      {
        quests,
        itemsOn: (date) => days.get(date) ?? [],
        now,
        locationPlaceId: at.location === null ? null : (this.places.at(at.location)?.place.id ?? null),
      },
      this.travel,
    );
    const answer = questAnswer({
      input,
      now,
      asker: { userId: askerId, name: asker.name, me: true, items: [...days.values()].flat(), position: at.location },
      planning,
      placeOf: (placeId) => this.placeOf(placeId),
      listed: new Map(listed.map((quest) => [quest.id, quest])),
    });
    return { answer, planning };
  }

  // The Quests among these that the recruiting list gives the asker, each with its steps and the Friends who hold it.
  async dayQuests(askerId: string, listed: readonly RecruitingQuestDto[]): Promise<DayQuest[]> {
    const [stored, friends] = await Promise.all([
      this.prisma.quest.findMany({ where: { id: { in: listed.map(({ id }) => id) } }, include: QUEST_INCLUDE }),
      this.friends.list(askerId),
    ]);
    const friendIds = new Set(friends.map(({ id }) => id));
    return listed.flatMap(({ id }) => {
      const quest = stored.find((each) => each.id === id);
      return quest === undefined ? [] : [dayQuestOf(quest, friendIds, (place) => this.places.placeIdOf(place))];
    });
  }

  // The Place where these Quests of the recruiting list all meet, by the step each is judged on; null when they meet at
  // more than one, or none is listed.
  async meetingPlace(askerId: string, questIds: readonly string[], now: Date): Promise<string | null> {
    return meetingPlaceOf(await this.dayQuests(askerId, await this.recruiting.listedAmong(askerId, questIds)), now);
  }

  listedFor(askerId: string, { globalEventId, questIds }: QuestsInput): Promise<RecruitingQuestDto[]> {
    if (globalEventId === null) {
      return this.recruiting.listedAmong(askerId, questIds ?? []);
    }
    // oxlint-disable-next-line unicorn/no-useless-undefined -- the list takes its Board, here any, by position
    return this.recruiting.list(askerId, globalEventId, undefined);
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}

type PlaceIdOf = (place: SubQuestPlaceDto) => string | null;

// The steps with each Place read one way: `attending` for the attending step, `written` for any other.
function stepsReadAs(quest: StoredQuest, attending: PlaceIdOf, written: PlaceIdOf): QuestStep[] {
  return subQuestContentsOf(quest).map(({ startsAt, endsAt, place, cancelled }, index) => {
    const read = quest.subQuests[index]?.attending === true ? attending : written;
    return {
      start: dateOf(startsAt),
      end: dateOf(endsAt),
      placeId: place === null ? null : read(place),
      place: place?.label ?? null,
      cancelled,
    };
  });
}

// The Place id a step names itself.
const named: PlaceIdOf = ({ placeId }) => placeId;

const timedSome = (steps: readonly QuestStep[]): boolean =>
  steps.some(({ start, placeId, cancelled }) => !cancelled && start !== null && placeId !== null);

// A party is judged on the steps that name a Place of the list. When none does, as the party form writes an event's
// place as its point and words, on those its Holders wrote, at the Place their point or words are; and when those have
// none either, at its Global Event's place, by its attending step, as a Global Event is placed.
function stepsOf(quest: StoredQuest, placeIdOf: PlaceIdOf): QuestStep[] {
  const own = stepsReadAs(quest, named, named);
  if (timedSome(own)) {
    return own;
  }
  const written = stepsReadAs(quest, named, placeIdOf);
  return timedSome(written) ? written : stepsReadAs(quest, placeIdOf, placeIdOf);
}

function dayQuestOf(quest: StoredQuest, friendIds: ReadonlySet<string>, placeIdOf: PlaceIdOf): DayQuest {
  return {
    id: quest.id,
    title: quest.title,
    steps: stepsOf(quest, placeIdOf),
    eventEnd: quest.globalEvent?.endsAt ?? null,
    friendNames: quest.holders.filter(({ userId }) => friendIds.has(userId)).map(({ user }) => user.name),
  };
}

function judgedStepDate(quest: DayQuest, now: Date): string | null {
  const step = judgedStep(quest, now);
  return step === undefined ? null : koreaDate(step.start);
}
