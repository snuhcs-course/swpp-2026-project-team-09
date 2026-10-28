/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { FriendsService, ofUser } from '../../friends/friends.service.js';
import { Weekday } from '../../generated/prisma/client.js';
import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { PlacesService } from '../../places/places.service.js';
import { TimetableService } from '../../timetable/timetable.service.js';
import { type Tool, type ToolContext } from '../feature.js';
import { FoundIds } from '../found-ids.js';
import { proposeQuest } from '../tools/propose-quest.js';
import { type Template, REPEAT_WINDOW_DAYS } from './constants.js';
import { type SuggestionActionDto, type SuggestionQuery } from './dto/suggestion.dto.js';
import { koreaWeekday } from './korea-day.js';
import {
  type Candidate,
  type CandidateAction,
  type FriendToday,
  type LedQuest,
  lunchWithFreeFriend,
  partyForOpenEvent,
  repeatLast,
  routeToNextClass,
  type TodaysClass,
} from './templates.js';

// A template that applies now, with what a tap runs.
export interface EligibleSuggestion {
  template: Template;
  text: string;
  reason: string;
  repeats: number;
  action: SuggestionActionDto;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Reads what the templates decide from, one query each, and runs every Proposal through proposeQuest.
@Injectable()
export class SuggestionCandidates {
  private readonly propose: Tool;

  constructor(
    private readonly prisma: PrismaService,
    private readonly timetable: TimetableService,
    private readonly globalEvents: GlobalEventsService,
    friends: FriendsService,
    places: PlacesService,
  ) {
    this.propose = proposeQuest({ friends, places, globalEvents });
  }

  // The templates that apply now. A Proposal the chat's checks refuse leaves its template out. The Quests made from
  // suggestions are no habit.
  async eligible(
    userId: string,
    now: Date,
    { screen, openCard }: SuggestionQuery,
    madeFromSuggestions: ReadonlySet<string>,
  ): Promise<EligibleSuggestion[]> {
    const weekday = koreaWeekday(now);
    const [classes, friends, led, event] = await Promise.all([
      this.classesOn(userId, weekday),
      this.friendsOn(userId, weekday),
      this.ledQuests(userId, now),
      this.openEvent(openCard),
    ]);
    const sharing = friends.filter(({ sharing: on }) => on);
    const organic = led.filter(({ id }) => !madeFromSuggestions.has(id));
    const candidates = [
      lunchWithFreeFriend(now, classes, sharing),
      routeToNextClass(screen, now, classes),
      partyForOpenEvent(now, event),
      repeatLast(now, organic, new Set(friends.map(({ id }) => id))),
    ].filter((candidate) => candidate !== null);
    const eligible = await Promise.all(candidates.map((candidate) => this.withAction(userId, now, candidate)));
    return eligible.filter((candidate) => candidate !== null);
  }

  private async classesOn(userId: string, weekday: Weekday): Promise<TodaysClass[]> {
    const classes = await this.timetable.classesOf(userId);
    return classes.flatMap(({ courseName, times }) =>
      times
        .filter((time) => time.weekday === weekday)
        .map(({ startTime, endTime, place }) => ({
          courseName,
          startTime,
          endTime,
          place: place === null ? null : { id: place.id, name: place.name },
        })),
    );
  }

  // Every Friend, with whether the friendship has its switch on at both ends, as Location Sharing reads it.
  private async friendsOn(userId: string, weekday: Weekday): Promise<(FriendToday & { sharing: boolean })[]> {
    const today = { where: { weekday }, select: { startTime: true, endTime: true } };
    const friend = { select: { id: true, name: true, timetableClasses: { select: { times: today } } } };
    const rows = await this.prisma.friendship.findMany({
      where: { acceptedAt: { not: null }, ...ofUser(userId) },
      select: { userAId: true, userASharing: true, userBSharing: true, userA: friend, userB: friend },
    });
    return rows.map(({ userAId, userASharing, userBSharing, userA, userB }) => {
      const other = userAId === userId ? userB : userA;
      return {
        id: other.id,
        name: other.name,
        times: other.timetableClasses.flatMap(({ times }) => times),
        sharing: userASharing && userBSharing,
      };
    });
  }

  // The Quests the User led whose first Sub Quest with a Place started in the last 14 days, by that Sub Quest.
  private async ledQuests(userId: string, now: Date): Promise<LedQuest[]> {
    const subQuests = await this.prisma.subQuest.findMany({
      where: {
        attending: false,
        placeId: { not: null },
        startsAt: { gte: new Date(now.getTime() - REPEAT_WINDOW_DAYS * DAY_MS), lte: now },
        quest: { leaderId: userId },
      },
      orderBy: { startsAt: 'asc' },
      select: {
        startsAt: true,
        place: { select: { id: true, name: true } },
        quest: {
          select: {
            id: true,
            joinPolicy: true,
            board: true,
            capacity: true,
            description: true,
            holders: { select: { userId: true } },
          },
        },
      },
    });
    const first = new Map<string, LedQuest>();
    for (const { startsAt, place, quest } of subQuests) {
      if (startsAt !== null && place !== null && !first.has(quest.id)) {
        const holderIds = quest.holders.map((holder) => holder.userId).filter((id) => id !== userId);
        first.set(quest.id, { ...quest, startsAt, place, holderIds });
      }
    }
    return [...first.values()];
  }

  private async openEvent(id: string | undefined): Promise<PublishedGlobalEventDto | undefined> {
    return id === undefined ? undefined : (await this.globalEvents.publishedAmong([id]))[0];
  }

  private async withAction(userId: string, now: Date, candidate: Candidate): Promise<EligibleSuggestion | null> {
    const { action } = candidate;
    if (action.type === 'route') {
      return { ...candidate, action };
    }
    const proposal = await this.proposalOf(userId, now, action);
    return proposal === null ? null : { ...candidate, action: { type: 'proposal', proposal } };
  }

  // proposeQuest as the chat runs it, with the template's ids as if a resolver had returned them in this message, so
  // that a suggestion passes exactly the checks a chat Proposal does. A refusal leaves no Proposal.
  private async proposalOf(
    userId: string,
    now: Date,
    { input, found }: Extract<CandidateAction, { type: 'proposal' }>,
  ): Promise<ToolContext['presented']['proposal']> {
    const ids = new FoundIds();
    for (const { kind, id } of found) {
      ids.add(kind, [id]);
    }
    const context: ToolContext = {
      userId,
      now,
      found: ids,
      shown: null,
      presented: { mapButtons: [], cards: [], proposal: null },
    };
    await this.propose.run(input, context);
    return context.presented.proposal;
  }
}
