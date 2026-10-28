/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { databaseCauseOf } from '../../common/database-cause.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type AliasHit, type PlaceAliases } from '../../places/place-aliases.js';

// What a User teaches aliases for. Events are left out, as they end.
export type AliasKind = 'place' | 'friend';

// A User's own aliases (user_aliases): the targets they chose for their words, which answer them alone. As a source of
// Place aliases, the first the matcher asks; resolveFriend asks it for Friends.
export class PersonalAliases implements PlaceAliases {
  private readonly logger = new Logger(PersonalAliases.name);

  constructor(private readonly prisma: PrismaService) {}

  // The targets the User taught for the words, normalised, the most chosen first.
  async targets(userId: string, kind: AliasKind, words: string): Promise<string[]> {
    const rows = await this.prisma.userAlias.findMany({
      where: { userId, kind, words },
      orderBy: [{ uses: 'desc' }, { lastUsedAt: 'desc' }],
      select: { targetId: true },
    });
    return rows.map(({ targetId }) => targetId);
  }

  // Marks the aliases that answered as used now. A failure is logged, and the answer stands.
  async used(userId: string, kind: AliasKind, words: string, targetIds: string[]): Promise<void> {
    if (targetIds.length === 0) {
      return;
    }
    try {
      await this.prisma.userAlias.updateMany({
        where: { userId, kind, words, targetId: { in: targetIds } },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`An alias's use was not recorded: ${databaseCauseOf(error)}`);
    }
  }

  async lookup(query: string, userId: string): Promise<AliasHit[]> {
    const placeIds = await this.targets(userId, 'place', query);
    await this.used(userId, 'place', query, placeIds);
    return placeIds.map((placeId) => ({ placeId, source: 'personal' }));
  }
}
