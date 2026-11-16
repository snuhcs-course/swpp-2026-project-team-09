/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  type EventsInput,
  type MealInput,
  type MeetInput,
  type NewQuestInput,
  type Plan,
  type PlanInput,
} from '../assistant/dto/answer.dto.js';
import { outOfReach } from '../assistant/free-time/tool-parts.js';
import { PlanAnswersService } from '../assistant/plan-answers.service.js';
import { CAPACITY_MIN } from '../assistant/recruiting/new-quest-answer.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendAsksService } from '../friends/friend-asks.service.js';
import { JoinPolicy, type Prisma, QuestBoard } from '../generated/prisma/client.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { type CreatedInvitation, InvitationsService } from '../quests/invitations.service.js';
import { ALONE_CAPACITY, QuestsService, type SubQuestColumns } from '../quests/quests.service.js';
import { conflict, sharedQuestHeld } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { aloneLeaveBy, goingLine, nextWordOf } from './alone-plan.js';
import { type PlanQuestBody, type PlanQuestDto } from './dto/plan-quest.dto.js';

// The Sub Quests of a Plan, each ending where the next starts and the last at the Plan's end.
export const subQuestsOf = ({ subQuests, endAt }: Plan): SubQuestColumns[] =>
  subQuests.map(({ at, placeId, title }, index) => ({
    title,
    startsAt: new Date(at),
    endsAt: new Date(subQuests[index + 1]?.at ?? endAt),
    placeId,
    latitude: null,
    longitude: null,
    placeLabel: null,
  }));

// A new Quest's steps each run from their start to the Plan's end: everyone meets at the Place as the event or the
// activity starts there, so no step ends where the next starts.
const newQuestStepsOf = ({ subQuests, endAt }: Plan): SubQuestColumns[] =>
  subQuests.map(({ at, placeId, title }) => ({
    title,
    startsAt: new Date(at),
    endsAt: new Date(endAt),
    placeId,
    latitude: null,
    longitude: null,
    placeLabel: null,
  }));

// A meal's Plan, a meet's, and a new recruiting Quest's are made into a Quest; the Quests to join are joined from their
// cards.
export function mealOrMeetInputOf(input: PlanInput): MealInput | MeetInput {
  if (input.kind !== 'meal' && input.kind !== 'meet') {
    throw new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      code: 'PLAN_KIND',
      message: "Only a meal's plan, a meet's, and a new recruiting Quest's are made into a Quest.",
    });
  }
  return input;
}

// A Plan taken alone: an events Plan, or a meal's or a meet's whose people are the asker only. Null for a Plan with a
// Friend and for any other kind.
function aloneInputOf(input: PlanInput): MealInput | MeetInput | EventsInput | null {
  if (input.kind === 'events') {
    return input;
  }
  if (input.kind === 'meal' || input.kind === 'meet') {
    return input.people.length < 2 ? input : null;
  }
  return null;
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly answers: PlanAnswersService,
    private readonly users: UsersService,
    private readonly quests: QuestsService,
    private readonly invitations: InvitationsService,
    private readonly signals: SignalsService,
    private readonly notifications: NotificationsService,
    private readonly asks: FriendAsksService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Plans again as the recalculation does, and makes the Plan named into a Quest the asker leads, inviting everyone
  // else of it. A Plan taken alone is a Quest the asker holds alone.
  async make(userId: string, making: PlanQuestBody): Promise<PlanQuestDto> {
    if (making.input.kind === 'new-quest') {
      return this.makeNewQuest(userId, making, making.input);
    }
    const alone = aloneInputOf(making.input);
    if (alone !== null) {
      return this.makeAlone(userId, making, alone);
    }
    const plan = await this.replanned(userId, making, []);
    const { questId, created } = await this.prisma.$transaction(async (tx) => {
      const made = await this.quests.createWithSubQuests(plan.title, subQuestsOf(plan), [userId], tx, {
        capacity: Math.max(CAPACITY_MIN, plan.parts.length),
      });
      return { questId: made, created: await this.invite(userId, made, plan, tx) };
    });
    this.keepTimeToLeave(userId, questId, plan);
    return this.made(userId, questId, created);
  }

  // Plans again as the recalculation does, with these Sub Quests left out of everyone's day, and answers the Plan named.
  async replanned(
    userId: string,
    { input, planId, startAt, location, locationMissing }: PlanQuestBody,
    leftOut: readonly string[],
  ): Promise<Plan> {
    const planned = mealOrMeetInputOf(input);
    const now = this.clock.now();
    if (outOfReach(planned.date, now)) {
      throw new BadRequestException('A plan is for a day from today to a week ahead');
    }
    const { plans } = await this.answers.plan(userId, planned, { now, location, locationMissing, leftOut });
    return planNamed(plans, planId, startAt);
  }

  // Plans the new recruiting Quest again, and posts it Open on its Board, inviting the Friends of the Plan. For a Global
  // Event it is the asker's Quest of the event, in place of one they held alone.
  private async makeNewQuest(userId: string, making: PlanQuestBody, input: NewQuestInput): Promise<PlanQuestDto> {
    const now = this.clock.now();
    if (outOfReach(input.date, now)) {
      throw new BadRequestException('A plan is for a day from today to a week ahead');
    }
    const { plans } = await this.answers.plan(userId, input, { now, location: making.location });
    const plan = planNamed(plans, making.planId, making.startAt);
    const settings = {
      capacity: Math.max(CAPACITY_MIN, plan.parts.length),
      joinPolicy: JoinPolicy.open,
      board: input.board ?? QuestBoard.hobby,
    };
    const steps = newQuestStepsOf(plan);
    const { globalEventId } = input;
    const { questId, created } = await this.prisma.$transaction(async (tx) => {
      const made =
        globalEventId === null
          ? await this.quests.createWithSubQuests(plan.title, steps, [userId], tx, settings)
          : await this.forGlobalEvent(userId, { id: globalEventId, title: plan.title }, tx, { ...settings, steps });
      return { questId: made, created: await this.invite(userId, made, plan, tx) };
    });
    return this.made(userId, questId, created);
  }

  // Plans again, and makes the Plan named a Quest the asker holds alone (`ALONE_CAPACITY`): a meal's with its steps, an
  // event's in place of the one they held alone for it. Keeps its leave-by, and answers the card's two lines.
  private async makeAlone(
    userId: string,
    making: PlanQuestBody,
    input: MealInput | MeetInput | EventsInput,
  ): Promise<PlanQuestDto> {
    const now = this.clock.now();
    if (outOfReach(input.date, now)) {
      throw new BadRequestException('A plan is for a day from today to a week ahead');
    }
    const { location, locationMissing } = making;
    const answer = await this.answers.plan(userId, input, { now, location, locationMissing });
    const plan = planNamed(answer.plans, making.planId, making.startAt);
    const settings = { capacity: ALONE_CAPACITY };
    const questId = await this.prisma.$transaction((tx) =>
      input.kind === 'events'
        ? this.forGlobalEvent(userId, { id: plan.id, title: plan.title }, tx, settings)
        : this.quests.createWithSubQuests(plan.title, subQuestsOf(plan), [userId], tx, settings),
    );
    const leaveBy = aloneLeaveBy(plan, nextWordOf(answer), now);
    if (leaveBy.facts !== null && leaveBy.at !== null) {
      await this.notifications.schedule(userId, { ...leaveBy.facts, questId }, leaveBy.at);
    }
    const made = await this.made(userId, questId, []);
    const lines = [goingLine(plan, input.kind), [{ text: leaveBy.line, strong: false }]];
    return { ...made, alone: { lines, remindAt: leaveBy.at?.toISOString() ?? null } };
  }

  // The asker's Quest for the Global Event, which they may hold only when they hold no Shared Quest for it.
  private async forGlobalEvent(
    userId: string,
    event: { id: string; title: string },
    tx: Prisma.TransactionClient,
    settings: Parameters<QuestsService['createForGlobalEvent']>[3],
  ): Promise<string> {
    await this.users.lock(userId, tx);
    if (!(await this.quests.freeForSharedQuest(userId, event.id, tx))) {
      throw sharedQuestHeld();
    }
    return this.quests.createForGlobalEvent(event, [userId], tx, settings);
  }

  // An invitation for everyone else of the Plan, in its order.
  private async invite(
    userId: string,
    questId: string,
    plan: Plan,
    tx: Prisma.TransactionClient,
  ): Promise<CreatedInvitation[]> {
    const invited = [];
    for (const part of plan.parts.filter((each) => each.userId !== userId)) {
      // oxlint-disable-next-line no-await-in-loop -- a transaction runs one query at a time
      invited.push(await this.invitations.create(userId, questId, part.userId, tx));
    }
    return invited;
  }

  // Tells the asker and each invitee once the Quest is committed, and answers it as the asker reads it.
  private async made(userId: string, questId: string, created: readonly CreatedInvitation[]): Promise<PlanQuestDto> {
    this.signals.send([userId], 'quests-changed');
    created.forEach((invitation) => {
      this.invitations.announce(invitation);
    });
    const invitations = created.map(({ id, userId: invitee }) => ({ id, userId: invitee }));
    return {
      quest: await this.quests.read(userId, questId),
      invitations,
      askLevels: await this.asks.notAskedAfterPlan(
        userId,
        invitations.map(({ userId: invitee }) => invitee),
      ),
    };
  }

  // Not awaited: the Leader's time to leave never fails the party's making or its change. Kept again, it replaces the
  // one before.
  keepTimeToLeave(userId: string, questId: string, plan: Plan): void {
    const part = plan.parts.find((each) => each.userId === userId);
    if (part === undefined || part.leaveAt === null || part.walkMinutes === null || part.walkMinutes === 0) {
      return;
    }
    const told = { kind: 'leave-by', questId, placeLabel: plan.place.label, walkMinutes: part.walkMinutes } as const;
    this.notifications.schedule(userId, told, new Date(part.leaveAt)).catch((error: unknown) => {
      this.logger.warn(`The Leader's time to leave was not kept: ${String(error)}`);
    });
  }
}

// The Plan named, which must still start when it was shown to.
function planNamed(plans: readonly Plan[], planId: string, startAt: string): Plan {
  const plan = plans.find(({ id }) => id === planId);
  if (plan === undefined || new Date(plan.startAt).getTime() !== new Date(startAt).getTime()) {
    throw conflict('PLAN_CHANGED', 'The plan is no longer the one shown. Recalculate it.');
  }
  return plan;
}
