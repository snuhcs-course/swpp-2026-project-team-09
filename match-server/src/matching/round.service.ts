/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { MatchingRequest, Prisma } from '../generated/prisma/client.js';
import { Grouping } from './grouping.js';
import { MainServerRefusal } from './main-server-refusal.js';
import { MainServer, problemOf } from './main-server.js';
import { PlacementService } from './placement.service.js';

const standingSchema = z.object({ standing: z.array(z.object({ userId: z.string(), globalEventId: z.string() })) });

const questSchema = z.object({ questId: z.uuid(), holderIds: z.array(z.string()) });

// The main server's answers that it creates no Quest for the match, however often it is asked.
const CLOSING_REFUSALS = new Set(['GLOBAL_EVENT_NOT_FOUND', 'GLOBAL_EVENT_STARTED', 'MATCH_TOO_SMALL']);

// A transaction ends after 5 seconds unless told otherwise, and each call to the main server may take that long.
const TRANSACTION_TIMEOUT_MS = 30_000;

function keyOf({ userId, globalEventId }: { userId: string; globalEventId: string }): string {
  return `${userId} ${globalEventId}`;
}

// The rounds that place waiting requests into Open Quests, turn the rest into matches and matches into Shared Quests
// (README.md: Rounds).
@Injectable()
export class RoundService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mainServer: MainServer,
    private readonly placement: PlacementService,
    private readonly grouping: Grouping,
    private readonly scheduler: SchedulerRegistry,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  onApplicationBootstrap(): void {
    const seconds = this.settings.get('ROUND_INTERVAL_SECONDS', { infer: true });
    const timer = setInterval(() => {
      this.run().catch((error: unknown) => {
        this.logger.error(`The round failed: ${problemOf(error)}`);
      });
    }, seconds * 1000);
    this.scheduler.addInterval('round', timer);
  }

  // Places requests into Open Quests and forms the matches, then asks the main server for the Quest of every match that
  // awaits one. Skipped while another match server runs a round.
  async run(): Promise<void> {
    if (await this.placeAndGroup()) {
      await this.askForQuests();
    }
  }

  // The advisory lock is held until the transaction ends, and only by one match server at a time, so that no request is
  // placed or grouped twice.
  private placeAndGroup(): Promise<boolean> {
    return this.prisma.$transaction(
      async (tx) => {
        const [{ locked }] = await tx.$queryRaw<[{ locked: boolean }]>`
          SELECT pg_try_advisory_xact_lock(hashtext('matching-round')) AS locked`;
        if (!locked) {
          return false;
        }
        const waiting = await tx.matchingRequest.findMany({
          where: { state: 'waiting' },
          orderBy: [{ arrivedAt: 'asc' }, { id: 'asc' }],
        });
        const standing = waiting.length === 0 ? null : await this.askWhichStand(waiting);
        if (standing === null) {
          return true;
        }
        // A request withdrawn while the main server answered is left alone. The rest stay locked until the round ends.
        const locks = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM matching_requests
          WHERE id = ANY(${waiting.map(({ id }) => id)}::uuid[]) AND state = 'waiting'
          FOR UPDATE`;
        const stillWaiting = new Set(locks.map(({ id }) => id));
        const open = waiting.filter(({ id }) => stillWaiting.has(id));
        await tx.matchingRequest.updateMany({
          where: { id: { in: open.filter((request) => !standing.has(keyOf(request))).map(({ id }) => id) } },
          data: { state: 'expired' },
        });
        const unplaced = await this.placement.place(
          open.filter((request) => standing.has(keyOf(request))),
          tx,
        );
        await this.group(unplaced, tx);
        return true;
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }

  // The keys of the requests that still stand, or null when the main server does not answer.
  private async askWhichStand(waiting: readonly MatchingRequest[]): Promise<Set<string> | null> {
    try {
      const { standing } = await this.mainServer.post(
        '/matching-requests/standing',
        { requests: waiting.map(({ userId, globalEventId }) => ({ userId, globalEventId })) },
        standingSchema,
      );
      return new Set(standing.map((request) => keyOf(request)));
    } catch (error) {
      this.logger.warn(`The round groups nothing: ${problemOf(error)}`);
      return null;
    }
  }

  // Each Global Event and size is a pool of its own, given to grouping once it holds one group.
  private async group(requests: readonly MatchingRequest[], tx: Prisma.TransactionClient): Promise<void> {
    const pools = new Map<string, MatchingRequest[]>();
    for (const request of requests) {
      const key = `${request.globalEventId} ${request.size}`;
      const pool = pools.get(key) ?? [];
      pool.push(request);
      pools.set(key, pool);
    }
    const matched: string[] = [];
    for (const pool of pools.values()) {
      const [{ globalEventId, size }] = pool;
      if (pool.length < size) {
        continue;
      }
      // oxlint-disable-next-line no-await-in-loop -- one transaction runs one query at a time
      for (const group of await this.grouping.group(pool, size)) {
        const ids = group.map(({ id }) => id);
        // oxlint-disable-next-line no-await-in-loop -- as above
        await tx.match.create({ data: { globalEventId, requests: { connect: ids.map((id) => ({ id })) } } });
        matched.push(...ids);
      }
    }
    await tx.matchingRequest.updateMany({ where: { id: { in: matched } }, data: { state: 'matched' } });
  }

  private async askForQuests(): Promise<void> {
    const awaiting = await this.prisma.match.findMany({
      where: { state: 'awaiting_quest' },
      orderBy: { formedAt: 'asc' },
      select: { id: true },
    });
    for (const { id } of awaiting) {
      // oxlint-disable-next-line no-await-in-loop -- one match after another
      await this.askForQuest(id);
    }
  }

  // The match is claimed, so that no other match server asks for it at the same moment. Without an answer it awaits
  // its Quest still, and the next round asks again.
  private async askForQuest(matchId: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM matches WHERE id = ${matchId}::uuid AND state = 'awaiting_quest' FOR UPDATE SKIP LOCKED`;
        if (claimed.length === 0) {
          return;
        }
        const { globalEventId, requests } = await tx.match.findUniqueOrThrow({
          where: { id: matchId },
          include: { requests: { orderBy: { arrivedAt: 'asc' } } },
        });
        try {
          const { questId, holderIds } = await this.mainServer.post(
            `/matches/${matchId}/quest`,
            { globalEventId, userIds: requests.map(({ userId }) => userId) },
            questSchema,
          );
          await tx.match.update({ where: { id: matchId }, data: { state: 'quest_created', questId } });
          // A matched User who has come to hold a Shared Quest for the Global Event is left out of the new one.
          await tx.matchingRequest.updateMany({
            where: { matchId, userId: { notIn: holderIds } },
            data: { state: 'expired' },
          });
        } catch (error) {
          if (error instanceof MainServerRefusal && CLOSING_REFUSALS.has(error.code)) {
            await tx.match.update({ where: { id: matchId }, data: { state: 'closed' } });
            await tx.matchingRequest.updateMany({ where: { matchId }, data: { state: 'expired' } });
            return;
          }
          this.logger.warn(`The match ${matchId} awaits its Quest still: ${problemOf(error)}`);
        }
      },
      { timeout: TRANSACTION_TIMEOUT_MS },
    );
  }
}
