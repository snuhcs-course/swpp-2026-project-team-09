/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { databaseCauseOf } from '../../common/database-cause.js';
import { heldBack } from '../../common/holdback.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type PlaceAlias } from '../../generated/prisma/client.js';
import { type AliasHit, type PlaceAliases } from '../../places/place-aliases.js';
import { MIN_SCORE, scoreOf } from './alias-rules.js';

export interface GlobalAliasSettings {
  // ASSISTANT_GLOBAL_ALIASES.
  enabled: boolean;
  // ASSISTANT_ALIAS_HOLDBACK_PERCENT.
  holdbackPercent: number;
}

// Everyone's aliases (place_aliases): words enough distinct accounts chose one Place for (alias-rules.ts), each
// answering while it is not retired. Its score is computed again on every read, and one decayed under MIN_SCORE is
// retired there. Switched off, they answer nobody; they never answer a User of the held-back share, whose choices
// still count.
export class GlobalAliases implements PlaceAliases {
  private readonly logger = new Logger(GlobalAliases.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: GlobalAliasSettings,
  ) {}

  async lookup(query: string, userId: string): Promise<AliasHit[]> {
    if (!this.settings.enabled || heldBack(userId, this.settings.holdbackPercent)) {
      return [];
    }
    const now = new Date();
    const aliases = await this.prisma.placeAlias.findMany({ where: { words: query, retiredAt: null } });
    const active = aliases.filter((alias) => scoreOf(alias, alias.lastUsedAt, now) >= MIN_SCORE);
    await this.retire(
      aliases.filter((alias) => !active.includes(alias)),
      now,
    );
    await this.used(active, now);
    return active.map(({ placeId }) => ({ placeId, source: 'global' }));
  }

  // The aliases decay brought under MIN_SCORE. A failure is logged, and they still do not answer.
  private async retire(aliases: readonly PlaceAlias[], now: Date): Promise<void> {
    if (aliases.length === 0) {
      return;
    }
    try {
      await this.prisma.placeAlias.updateMany({
        where: { id: { in: aliases.map(({ id }) => id) } },
        data: { retiredAt: now },
      });
    } catch (error) {
      this.logger.warn(`An alias was not retired: ${databaseCauseOf(error)}`);
    }
  }

  // The aliases that answered, used now, so that their score stops decaying. A failure is logged, and the answer
  // stands.
  private async used(aliases: readonly PlaceAlias[], now: Date): Promise<void> {
    if (aliases.length === 0) {
      return;
    }
    try {
      await this.prisma.$transaction(
        aliases.map(({ id, supporters, rejecters }) =>
          this.prisma.placeAlias.update({ where: { id }, data: { lastUsedAt: now, score: supporters - rejecters } }),
        ),
      );
    } catch (error) {
      this.logger.warn(`An alias's use was not recorded: ${databaseCauseOf(error)}`);
    }
  }
}
