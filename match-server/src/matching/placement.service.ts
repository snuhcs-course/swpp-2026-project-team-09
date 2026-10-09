// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { MatchingRequest, Prisma } from '../generated/prisma/client.js';
import { MainServerRefusal } from './main-server-refusal.js';
import { MainServer, problemOf } from './main-server.js';

const eligibleSchema = z.object({
  quests: z.array(
    z.object({
      id: z.uuid(),
      globalEventId: z.string(),
      capacity: z.int(),
      freePlaces: z.int(),
      holderIds: z.array(z.string()),
      createdAt: z.iso.datetime(),
    }),
  ),
});

type EligibleQuest = z.infer<typeof eligibleSchema>['quests'][number];

const enteredSchema = z.object({ questId: z.uuid(), holderIds: z.array(z.string()) });

interface Placement {
  request: MatchingRequest;
  quest: EligibleQuest;
}

function poolOf({ globalEventId, size }: { globalEventId: string; size: number }): string {
  return `${globalEventId} ${size}`;
}

// The earliest Quest takes the earliest requests of its pool whose Users do not hold it, until it is full.
function assign(requests: readonly MatchingRequest[], quests: readonly EligibleQuest[]): Placement[] {
  const pools = new Map<string, MatchingRequest[]>();
  for (const request of requests) {
    pools.set(poolOf(request), [...(pools.get(poolOf(request)) ?? []), request]);
  }
  const byAge = quests.toSorted(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id),
  );
  const placements: Placement[] = [];
  for (const quest of byAge) {
    const pool = poolOf({ globalEventId: quest.globalEventId, size: quest.capacity });
    const holders = new Set(quest.holderIds);
    const left = pools.get(pool) ?? [];
    const placed = left.filter(({ userId }) => !holders.has(userId)).slice(0, quest.freePlaces);
    pools.set(
      pool,
      left.filter((request) => !placed.includes(request)),
    );
    placements.push(...placed.map((request) => ({ request, quest })));
  }
  return placements;
}

// The part of a round that places waiting requests into Open Quests that have a free place (README.md: Rounds). A
// placement keeps no record of its own: its request waits until the main server answers that its User entered.
@Injectable()
export class PlacementService {
  private readonly logger = new Logger(PlacementService.name);

  constructor(private readonly mainServer: MainServer) {}

  // Places the standing requests, given in the order they arrived, and answers those it did not try to place, which
  // the round groups. A request the main server refused or did not answer about waits for the next round.
  async place(requests: readonly MatchingRequest[], tx: Prisma.TransactionClient): Promise<MatchingRequest[]> {
    if (requests.length === 0) {
      return [];
    }
    const placements = assign(requests, await this.askForEligible(requests));
    for (const placement of placements) {
      // oxlint-disable-next-line no-await-in-loop -- one transaction runs one query at a time
      await this.placeOne(placement, tx);
    }
    const tried = new Set(placements.map(({ request }) => request.id));
    return requests.filter(({ id }) => !tried.has(id));
  }

  // The eligible Quests of each Global Event and size, or none when the main server does not answer.
  private async askForEligible(requests: readonly MatchingRequest[]): Promise<EligibleQuest[]> {
    const pools = new Map(
      requests.map(({ globalEventId, size }) => [poolOf({ globalEventId, size }), { globalEventId, size }]),
    );
    try {
      const { quests } = await this.mainServer.post(
        '/matching-requests/eligible-quests',
        { pools: [...pools.values()] },
        eligibleSchema,
      );
      return quests;
    } catch (error) {
      this.logger.warn(`The round places nothing: ${problemOf(error)}`);
      return [];
    }
  }

  private async placeOne({ request, quest }: Placement, tx: Prisma.TransactionClient): Promise<void> {
    try {
      await this.mainServer.post(
        '/matching-requests/placements',
        { questId: quest.id, userId: request.userId, size: request.size },
        enteredSchema,
      );
    } catch (error) {
      // Every refusal, such as a Quest that filled, leaves the request waiting, as no answer does.
      if (error instanceof MainServerRefusal) {
        this.logger.log(`The request ${request.id} waits: its placement was refused with ${error.code}`);
      } else {
        this.logger.warn(`The request ${request.id} waits: ${problemOf(error)}`);
      }
      return;
    }
    await tx.matchingRequest.update({ where: { id: request.id }, data: { state: 'matched', questId: quest.id } });
  }
}
