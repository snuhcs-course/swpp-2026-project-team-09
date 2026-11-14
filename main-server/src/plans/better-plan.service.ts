/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Plan, type PlanInput } from '../assistant/dto/answer.dto.js';
import { mealWindow } from '../assistant/free-time/meal-fit.js';
import { outOfReach } from '../assistant/free-time/tool-parts.js';
import { MealPlanService } from '../assistant/gathering/meal-plan.service.js';
import { MINUTE_MS } from '../assistant/gathering/gathering.js';
import { koreaDate, koreaTime } from '../assistant/korea-time.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { type Prisma } from '../generated/prisma/client.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QUEST_INCLUDE, type QuestDto, type StoredQuest, toSubQuestDto } from '../quests/dto/quest.dto.js';
import { LeaderService } from '../quests/leader.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { inOrder } from '../quests/sub-quest-order.js';
import { conflict } from '../quests/refusals.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { type BetterPlanDto } from './dto/better-plan.dto.js';
import { type PlanQuestBody } from './dto/plan-quest.dto.js';
import { toCardStep } from './invitation-card.service.js';
import { gatheringOf, placePoint } from './own-way.js';
import { PlansService, subQuestsOf } from './plans.service.js';

const MEALS = ['lunch', 'dinner'] as const;

const NONE: BetterPlanDto = { current: null, better: null, input: null };

// The Leader, the other Holders in the order they entered, then the Users whose invitation waits, by when it was sent.
const peopleOf = ({ leaderId, holders, invitations }: StoredQuest): string[] => [
  leaderId,
  ...holders.map(({ userId }) => userId).filter((id) => id !== leaderId),
  ...invitations.map(({ userId }) => userId),
];

function refuseOtherPeople({ people }: PlanInput, quest: StoredQuest): void {
  const [leaderId, ...others] = peopleOf(quest);
  const [first, ...rest] = people.map(({ userId }) => userId);
  if (first !== leaderId || rest.length !== others.length || !others.every((id) => rest.includes(id))) {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      code: 'PLAN_PEOPLE_CHANGED',
      message: 'The plan is not for the people of the Quest. Ask for a better plan again.',
    });
  }
}

// After a decline: whether the people left have a better Plan than the Quest as it stands, and the change to it.
@Injectable()
export class BetterPlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly mealPlans: MealPlanService,
    private readonly quests: QuestsService,
    private readonly leaders: LeaderService,
    private readonly signals: SignalsService,
    private readonly places: PlaceLookup,
    @Inject(TRAVEL_PROVIDER) private readonly travel: TravelProvider,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async better(userId: string, questId: string, location: Position | null): Promise<BetterPlanDto> {
    await this.leaders.ledBy(questId, userId);
    const quest = await this.stored(questId);
    const now = this.clock.now();
    const steps = quest.subQuests.map((subQuest) =>
      toCardStep(toSubQuestDto(subQuest, quest.globalEvent, userId, now)),
    );
    const destination = gatheringOf(steps, this.travel)?.destination;
    if (destination === undefined || destination.end === null) {
      return NONE;
    }
    const { start, end, placeId } = destination;
    const date = koreaDate(start);
    const meal = MEALS.find((each) => {
      const window = mealWindow(date, each);
      return window.start <= start && start < window.end;
    });
    if (meal === undefined) {
      return NONE;
    }
    const input: PlanInput = {
      kind: 'meal',
      date,
      meal,
      people: peopleOf(quest).map((id) => ({ userId: id, constraints: [] })),
      window: { from: null, until: null },
      placeId: null,
    };
    const current = {
      place: placePoint(placeId, (id) => this.placeOf(id)),
      startAt: koreaTime(start),
      endAt: koreaTime(end),
      togetherMinutes: Math.floor((end.getTime() - start.getTime()) / MINUTE_MS),
    };
    const [first] = outOfReach(date, now) ? [] : await this.plansFor(userId, input, { now, location, quest });
    const elsewhere =
      first !== undefined && (first.place.placeId !== placeId || new Date(first.startAt).getTime() !== start.getTime());
    return { current, better: elsewhere && first.togetherMinutes > current.togetherMinutes ? first : null, input };
  }

  async change(userId: string, questId: string, making: PlanQuestBody): Promise<QuestDto> {
    const { globalEventId } = await this.leaders.ledBy(questId, userId);
    if (globalEventId !== null) {
      throw conflict('ATTENDING_SUB_QUEST', 'A Quest for a Global Event follows its event, and no plan changes it.');
    }
    const quest = await this.stored(questId);
    refuseOtherPeople(making.input, quest);
    const plan = await this.plans.replanned(
      userId,
      making,
      quest.subQuests.map(({ id }) => id),
    );
    const told = await this.prisma.$transaction(async (tx) => {
      await this.leaders.lockLed(questId, userId, tx);
      const locked = await this.stored(questId, tx);
      refuseOtherPeople(making.input, locked);
      await tx.quest.update({
        where: { id: questId },
        data: { title: plan.title, subQuests: { deleteMany: {}, create: inOrder(subQuestsOf(plan)) } },
      });
      return peopleOf(locked);
    });
    this.signals.send(told, 'plan-changed', { questId });
    this.signals.send(told, 'quests-changed');
    return this.quests.read(userId, questId);
  }

  // A refusal for the people, such as one who is no longer the Leader's Friend, offers no better Plan.
  private async plansFor(
    userId: string,
    input: PlanInput,
    { now, location, quest }: { now: Date; location: Position | null; quest: StoredQuest },
  ): Promise<Plan[]> {
    try {
      const leftOut = quest.subQuests.map(({ id }) => id);
      return (await this.mealPlans.plan(userId, input, { now, location, leftOut })).plans;
    } catch (error) {
      if (error instanceof BadRequestException) {
        return [];
      }
      throw error;
    }
  }

  private stored(questId: string, tx: Prisma.TransactionClient = this.prisma): Promise<StoredQuest> {
    return tx.quest.findUniqueOrThrow({ where: { id: questId }, include: QUEST_INCLUDE });
  }

  private placeOf(placeId: string): PlaceDto {
    const place = this.places.byId(placeId);
    if (place === null) {
      throw new Error(`No Place ${placeId}`);
    }
    return place;
  }
}
