import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, JoinPolicy, Prisma } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from './clock.js';
import { hasSubQuestsAhead, QUEST_INCLUDE } from './dto/quest.dto.js';

// A request for Matching on a Global Event, which the match server keeps.
export interface MatchingCandidate {
  userId: string;
  globalEventId: string;
}

// The refusal codes of a request for Matching that cannot stand.
export type MatchingRefusal = 'GLOBAL_EVENT_NOT_FOUND' | 'GLOBAL_EVENT_STARTED' | 'SHARED_QUEST_HELD';

// The waiting requests of one Global Event and group size.
export interface MatchingPool {
  globalEventId: string;
  size: number;
}

// An Open Quest a request for Matching can be placed into.
export interface EligibleQuest {
  id: string;
  globalEventId: string;
  capacity: number;
  freePlaces: number;
  holderIds: string[];
  createdAt: Date;
}

// What Matching reads of the Quests (README.md: Quests). QuestsService makes every change to them.
@Injectable()
export class MatchingQuestsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Why each request for Matching cannot stand now, in the order given, or null for one that stands: its Global Event
  // is published and has not started, and its User holds no Shared Quest for it. A Global Event without a start counts
  // as not started.
  async matchingRefusals(
    requests: readonly MatchingCandidate[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<(MatchingRefusal | null)[]> {
    const globalEvents = await tx.globalEvent.findMany({
      where: { id: { in: requests.map(({ globalEventId }) => globalEventId) }, state: GlobalEventState.published },
      select: { id: true, startsAt: true },
    });
    const startOf = new Map(globalEvents.map(({ id, startsAt }) => [id, startsAt]));
    const holders = await tx.questHolder.findMany({
      where: { OR: requests.map(({ userId, globalEventId }) => ({ userId, globalEventId })) },
      // Two Holders are enough to tell a Shared Quest.
      select: { userId: true, globalEventId: true, quest: { select: { holders: { select: { id: true }, take: 2 } } } },
    });
    const holdingShared = new Set(
      holders
        .filter(({ quest }) => quest.holders.length > 1)
        .map(({ userId, globalEventId }) => `${userId} ${globalEventId}`),
    );
    const now = this.clock.now();
    return requests.map(({ userId, globalEventId }) => {
      const startsAt = startOf.get(globalEventId);
      if (startsAt === undefined) {
        return 'GLOBAL_EVENT_NOT_FOUND';
      }
      if (startsAt !== null && startsAt <= now) {
        return 'GLOBAL_EVENT_STARTED';
      }
      return holdingShared.has(`${userId} ${globalEventId}`) ? 'SHARED_QUEST_HELD' : null;
    });
  }

  // The Quests Matching may place a request of the pool into: Open, of the pool's Global Event, with a capacity of the
  // pool's size, a free place and a Sub Quest ahead. The earliest first, each with its Holders in the order they
  // entered.
  async eligibleQuests(pools: readonly MatchingPool[]): Promise<EligibleQuest[]> {
    if (pools.length === 0) {
      return [];
    }
    const quests = await this.prisma.quest.findMany({
      where: {
        joinPolicy: JoinPolicy.open,
        OR: pools.map(({ globalEventId, size }) => ({ globalEventId, capacity: size })),
      },
      include: QUEST_INCLUDE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const now = this.clock.now();
    return quests.flatMap((quest) => {
      const { id, globalEventId, capacity, holders, createdAt } = quest;
      if (globalEventId === null || holders.length >= capacity || !hasSubQuestsAhead(quest, now)) {
        return [];
      }
      const holderIds = holders.map(({ userId }) => userId);
      return [{ id, globalEventId, capacity, freePlaces: capacity - holders.length, holderIds, createdAt }];
    });
  }

  // The id of the Quest created for the match server's match, if any.
  async forMatch(matchId: string, tx: Prisma.TransactionClient): Promise<string | null> {
    const quest = await tx.quest.findUnique({ where: { matchId }, select: { id: true } });
    return quest?.id ?? null;
  }
}
