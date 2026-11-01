/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { PrismaService } from '../../common/prisma.service.js';
import { type ResolutionOutcome } from '../../generated/prisma/client.js';
import { type AliasRejections } from '../../places/place-aliases.js';

// What a User said 아니에요 to (P07 ticket 03): the Places whose newest chosen, edited or rejected row of theirs for the
// words is the rejection. No alias answers that User those words with such a Place until they choose it again, so
// that a rejection is heard by the one who made it while everyone's alias stands for the others.
export class RejectedAliases implements AliasRejections {
  constructor(private readonly prisma: PrismaService) {}

  async excluded(query: string, userId: string): Promise<ReadonlySet<string>> {
    const rows = await this.prisma.resolutionEvent.findMany({
      where: { userId, kind: 'place', words: query, outcome: { in: ['chosen', 'edited', 'rejected'] } },
      orderBy: { createdAt: 'desc' },
      select: { chosenId: true, outcome: true },
    });
    const newest = new Map<string, ResolutionOutcome>();
    for (const { chosenId, outcome } of rows) {
      if (chosenId !== null && !newest.has(chosenId)) {
        newest.set(chosenId, outcome);
      }
    }
    return new Set([...newest].filter(([, outcome]) => outcome === 'rejected').map(([placeId]) => placeId));
  }
}
