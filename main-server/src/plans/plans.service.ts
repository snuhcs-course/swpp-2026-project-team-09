/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Plan } from '../assistant/dto/answer.dto.js';
import { outOfReach } from '../assistant/free-time/tool-parts.js';
import { MealPlanService } from '../assistant/gathering/meal-plan.service.js';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { InvitationsService } from '../quests/invitations.service.js';
import { QuestsService, type SubQuestColumns } from '../quests/quests.service.js';
import { conflict } from '../quests/refusals.js';
import { type PlanQuestBody, type PlanQuestDto } from './dto/plan-quest.dto.js';

// A Quest has room for this many unless its Plan has more people.
const CAPACITY_MIN = 4;

// The Sub Quests of a Plan, each ending where the next starts and the last at the Plan's end.
const subQuestsOf = ({ subQuests, endAt }: Plan): SubQuestColumns[] =>
  subQuests.map(({ at, placeId, title }, index) => ({
    title,
    startsAt: new Date(at),
    endsAt: new Date(subQuests[index + 1]?.at ?? endAt),
    placeId,
    latitude: null,
    longitude: null,
    placeLabel: null,
  }));

@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mealPlans: MealPlanService,
    private readonly quests: QuestsService,
    private readonly invitations: InvitationsService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Plans again as the recalculation does, and makes the Plan named into a Quest the asker leads, inviting everyone
  // else of it.
  async make(userId: string, { input, planId, startAt, location }: PlanQuestBody): Promise<PlanQuestDto> {
    const now = this.clock.now();
    if (outOfReach(input.date, now)) {
      throw new BadRequestException('A plan is for a day from today to a week ahead');
    }
    const { plans } = await this.mealPlans.plan(userId, input, { now, location });
    if (input.people.length < 2) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'PLAN_ALONE',
        message: 'A plan with no Friend makes no Quest.',
      });
    }
    const plan = plans.find(({ id }) => id === planId);
    if (plan === undefined || new Date(plan.startAt).getTime() !== new Date(startAt).getTime()) {
      throw conflict('PLAN_CHANGED', 'The plan is no longer the one shown. Recalculate it.');
    }
    const { questId, created } = await this.prisma.$transaction(async (tx) => {
      const made = await this.quests.createWithSubQuests(plan.title, subQuestsOf(plan), [userId], tx, {
        capacity: Math.max(CAPACITY_MIN, plan.parts.length),
      });
      const invited = [];
      for (const part of plan.parts.filter((each) => each.userId !== userId)) {
        // oxlint-disable-next-line no-await-in-loop -- a transaction runs one query at a time
        invited.push(await this.invitations.create(userId, made, part.userId, tx));
      }
      return { questId: made, created: invited };
    });
    this.signals.send([userId], 'quests-changed');
    created.forEach((invitation) => {
      this.invitations.announce(invitation);
    });
    return {
      quest: await this.quests.read(userId, questId),
      invitations: created.map(({ id, userId: invitee }) => ({ id, userId: invitee })),
    };
  }
}
