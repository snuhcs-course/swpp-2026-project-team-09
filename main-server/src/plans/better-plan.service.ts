/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Fable 5.2  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { type LocationMissing, type MealInput, type Plan } from '../assistant/dto/answer.dto.js';
import { mealWindow } from '../assistant/free-time/meal-fit.js';
import { outOfReach } from '../assistant/free-time/tool-parts.js';
import { MealPlanService } from '../assistant/gathering/meal-plan.service.js';
import { MINUTE_MS } from '../assistant/gathering/gathering.js';
import { koreaDate, koreaTime } from '../assistant/korea-time.js';
import { type Position } from '../common/geometry.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { type Prisma } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type CreatedInvitation, InvitationsService } from '../quests/invitations.service.js';
import { QUEST_INCLUDE, type QuestDto, type StoredQuest } from '../quests/dto/quest.dto.js';
import { LeaderService } from '../quests/leader.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { inOrder } from '../quests/sub-quest-order.js';
import { conflict } from '../quests/refusals.js';
import { tellStepChanged, TimesToLeave } from '../quests/step-told.js';
import { gatheringFrom, PARTY_CAPACITY } from '../quests/taken-alone.js';
import { type BetterPlanDto } from './dto/better-plan.dto.js';
import { type PlanQuestBody } from './dto/plan-quest.dto.js';
import { placePoint } from './own-way.js';
import { OwnWayReader } from './own-way-reader.service.js';
import { mealOrMeetInputOf } from './plan-kinds.js';
import { PlansService, subQuestsOf } from './plans.service.js';

const MEALS = ['lunch', 'dinner'] as const;

const NONE: BetterPlanDto = { current: null, better: null, input: null };

// The step a meet's Plan makes (meet-answer.ts). A meet has no meal's window to be planned better in.
const isMeetStep = ({ title }: { title: string }): boolean => title.endsWith('에서 만나기');

// The Leader, the other Holders in the order they entered, then the Users whose invitation waits, by when it was sent.
const peopleOf = ({ leaderId, holders, invitations }: StoredQuest): string[] => [
  leaderId,
  ...holders.map(({ userId }) => userId).filter((id) => id !== leaderId),
  ...invitations.map(({ userId }) => userId),
];

// The plan is for the Quest's people, each of them asked for and the Leader first, and perhaps Friends more: those
// who declined it (P05 ticket 17, row 6) or new to it (P05 ticket 44). Those more are invited, and given back. Leaving
// someone out is refused.
function invitedAgain({ people }: Pick<MealInput, 'people'>, quest: StoredQuest): string[] {
  const asked = people.map(({ userId }) => userId);
  const own = peopleOf(quest);
  if (asked[0] === quest.leaderId && own.every((id) => asked.includes(id))) {
    return asked.filter((id) => !own.includes(id));
  }
  throw new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    code: 'PLAN_PEOPLE_CHANGED',
    message: 'The plan is not for the people of the Quest. Ask for a better plan again.',
  });
}

const ms = (at: Date | null | undefined): number | null => at?.getTime() ?? null;

// The meal's own step, the last to start: whether the plan moves it, in time or Place.
function movesMeal({ subQuests }: StoredQuest, plan: Plan): boolean {
  const [stored] = subQuests.toSorted((a, b) => (ms(b.startsAt) ?? 0) - (ms(a.startsAt) ?? 0));
  const planned = subQuestsOf(plan).at(-1);
  return ms(stored?.startsAt) !== ms(planned?.startsAt) || stored?.placeId !== planned?.placeId;
}

// After a decline: whether the people left have a better Plan than the Quest as it stands, and the change to it.
@Injectable()
export class BetterPlanService {
  private readonly logger = new Logger(BetterPlanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plans: PlansService,
    private readonly mealPlans: MealPlanService,
    private readonly quests: QuestsService,
    private readonly leaders: LeaderService,
    private readonly invitations: InvitationsService,
    private readonly signals: SignalsService,
    private readonly ways: OwnWayReader,
    private readonly notifications: NotificationsService,
    private readonly timesToLeave: TimesToLeave,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async better(
    userId: string,
    questId: string,
    location: Position | null,
    locationMissing: LocationMissing,
  ): Promise<BetterPlanDto> {
    await this.leaders.ledBy(questId, userId);
    const quest = await this.stored(questId);
    const now = this.clock.now();
    const destination = this.ways.stepsOf(quest, userId, now).gathered?.destination;
    if (destination === undefined || destination.end === null || isMeetStep(destination)) {
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
    const input: MealInput = {
      kind: 'meal',
      date,
      meal,
      people: peopleOf(quest).map((id) => ({ userId: id, constraints: [] })),
      window: { from: null, until: null },
      placeId: null,
    };
    const current = {
      place: placePoint(placeId, this.ways.placeOf),
      startAt: koreaTime(start),
      endAt: koreaTime(end),
      togetherMinutes: Math.floor((end.getTime() - start.getTime()) / MINUTE_MS),
    };
    const [first] = outOfReach(date, now)
      ? []
      : await this.plansFor(userId, input, { now, location, locationMissing, quest });
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
    const input = mealOrMeetInputOf(making.input);
    invitedAgain(input, quest);
    const plan = await this.plans.replanned(
      userId,
      making,
      quest.subQuests.map(({ id }) => id),
    );
    const told = await this.prisma.$transaction(async (tx) => {
      await this.leaders.lockLed(questId, userId, tx);
      const locked = await this.stored(questId, tx);
      const again = invitedAgain(input, locked);
      const moved = movesMeal(locked, plan);
      await tx.quest.update({
        where: { id: questId },
        data: { title: plan.title, subQuests: { deleteMany: {}, create: inOrder(subQuestsOf(plan)) } },
      });
      if (again.length > 0) {
        await this.makeRoom(questId, locked, plan, tx);
      }
      const invited: CreatedInvitation[] = [];
      for (const friendId of again) {
        // oxlint-disable-next-line no-await-in-loop -- a transaction runs one query at a time
        invited.push(await this.invitations.create(userId, questId, friendId, tx));
      }
      const holderIds = locked.holders.map((holder) => holder.userId);
      return { people: peopleOf(locked), holderIds, by: locked.leader, invited, moved };
    });
    told.invited.forEach((invitation) => {
      this.invitations.announce(invitation);
    });
    this.signals.send(told.people, 'plan-changed', { questId });
    this.signals.send(told.people, 'quests-changed');
    // A plan that only invites more people keeps the meal where and when it was, and tells the Holders nothing.
    if (told.moved) {
      await this.tellMoved(questId, { userId, name: told.by.name }, told.holderIds, plan);
    }
    this.plans.keepTimeToLeave(userId, questId, plan);
    return this.quests.read(userId, questId);
  }

  // A refusal for the people, such as one who is no longer the Leader's Friend, offers no better Plan.
  private async plansFor(
    userId: string,
    input: MealInput,
    {
      now,
      location,
      locationMissing,
      quest,
    }: { now: Date; location: Position | null; locationMissing: LocationMissing; quest: StoredQuest },
  ): Promise<Plan[]> {
    try {
      const leftOut = quest.subQuests.map(({ id }) => id);
      return (await this.mealPlans.plan(userId, input, { now, location, locationMissing, leftOut })).plans;
    } catch (error) {
      if (error instanceof BadRequestException) {
        return [];
      }
      throw error;
    }
  }

  // As the room's 일정 수정 tells it: the Holders are told and their times to leave kept again for the new plan, each
  // other's by their Timetable and the Leader's by the plan (keepTimeToLeave).
  private async tellMoved(
    questId: string,
    by: { userId: string; name: string },
    holderIds: readonly string[],
    plan: Plan,
  ): Promise<void> {
    const [first] = subQuestsOf(plan);
    const changed = { questId, questTitle: plan.title, byId: by.userId, byName: by.name };
    const { notifications, logger, timesToLeave } = this;
    const told = {
      ...changed,
      stepTitle: first?.title ?? plan.title,
      startsAt: first?.startsAt ?? null,
      cancelled: false,
    };
    const byTimetable = holderIds.filter((id) => id !== by.userId);
    await tellStepChanged({ notifications, logger, timesToLeave }, holderIds, told, {
      now: this.clock.now(),
      byTimetable,
    });
  }

  // A Quest taken alone gathers others from now on (`gatheringFrom`), and every Quest holds the plan's people.
  private async makeRoom(questId: string, quest: StoredQuest, plan: Plan, tx: Prisma.TransactionClient): Promise<void> {
    const capacity = (await gatheringFrom(questId, tx)) ? PARTY_CAPACITY : quest.capacity;
    if (capacity < plan.parts.length) {
      await tx.quest.update({ where: { id: questId }, data: { capacity: plan.parts.length } });
    }
  }

  private stored(questId: string, tx: Prisma.TransactionClient = this.prisma): Promise<StoredQuest> {
    return tx.quest.findUniqueOrThrow({ where: { id: questId }, include: QUEST_INCLUDE });
  }
}
