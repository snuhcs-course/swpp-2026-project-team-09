/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { databaseCauseOf } from '../../common/database-cause.js';
import { normaliseWords } from '../../common/normalise-words.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type FriendDto } from '../../friends/dto/friends.dto.js';
import { FriendsService } from '../../friends/friends.service.js';
import { PlacesService } from '../../places/places.service.js';
import { type ChoiceKind } from '../feature.js';
import { ResolutionEventsService } from '../resolution-events.service.js';
import { ACCOUNT_AGE_DAYS, qualifies, scoreOf, type Standing, topOf } from './alias-rules.js';
import { type AliasDto } from './aliases.dto.js';
import { type AliasKind, PersonalAliases } from './personal-aliases.js';

// The names of a target that is gone: nothing more of a former Friend is shown.
const FORMER_FRIEND = '친구';
const FORMER_PLACE = '장소';

// One Place's standing for the words, or with no Place the count of every account that chose anything for them.
interface StandingRow {
  placeId: string | null;
  supporters: number;
  rejecters: number;
}

const aliasNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'ALIAS_NOT_FOUND',
    message: 'The User taught no such alias.',
  });

// What the Assistant learns from the User's choices (P07 ticket 03): each User's own aliases at once, and every User's
// Place aliases once enough distinct accounts agree (alias-rules.ts), from resolution_events.
@Injectable()
export class AliasesService {
  private readonly logger = new Logger(AliasesService.name);
  private readonly personal: PersonalAliases;

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolutionEvents: ResolutionEventsService,
    private readonly places: PlacesService,
    private readonly friends: FriendsService,
  ) {
    this.personal = new PersonalAliases(prisma);
  }

  // The one way an alias is learned: the User chose the target for their words, from a chip or by changing a
  // Proposal's Place, and the event is recorded. Their own alias is made, or chosen once more; for a Place, everyone's
  // standing of the words is counted again. Events teach nothing, as they end. A failure is logged, and the reply
  // stands.
  async learn(userId: string, kind: ChoiceKind, words: string, targetId: string): Promise<void> {
    const key = normaliseWords(words);
    if (kind === 'globalEvent' || key === '') {
      return;
    }
    try {
      await this.prisma.userAlias.upsert({
        where: { userId_kind_words_targetId: { userId, kind, words: key, targetId } },
        create: { userId, kind, words: key, targetId },
        update: { uses: { increment: 1 }, lastUsedAt: new Date() },
      });
      if (kind === 'place') {
        await this.recount(key);
      }
    } catch (error) {
      this.logger.warn(`An alias was not learned: ${databaseCauseOf(error)}`);
    }
  }

  // 아니에요: the User said an answer read from an alias was wrong. It is recorded as a rejected event, their own alias
  // for it is deleted, and for a Place everyone's standing of the words is counted again.
  async reject(userId: string, kind: AliasKind, words: string, targetId: string): Promise<void> {
    const key = normaliseWords(words);
    await this.resolutionEvents.rejected(userId, kind, key, targetId);
    await this.prisma.userAlias.deleteMany({ where: { userId, kind, words: key, targetId } });
    if (kind === 'place') {
      await this.recount(key);
    }
  }

  // Of the User's Friends, those the User taught for the words, in the order given. Someone who is no Friend any more
  // never answers.
  async taughtFriends(userId: string, words: string, friends: readonly FriendDto[]): Promise<FriendDto[]> {
    const key = normaliseWords(words);
    const taught = new Set(await this.personal.targets(userId, 'friend', key));
    const current = friends.filter(({ id }) => taught.has(id));
    await this.personal.used(
      userId,
      'friend',
      key,
      current.map(({ id }) => id),
    );
    return current;
  }

  // The User's own aliases, the most recently used first.
  async listMine(userId: string): Promise<AliasDto[]> {
    const [aliases, places, friends] = await Promise.all([
      this.prisma.userAlias.findMany({
        where: { userId, kind: { in: ['place', 'friend'] } },
        orderBy: [{ lastUsedAt: 'desc' }, { id: 'asc' }],
      }),
      this.places.list(),
      this.friends.listFriends(userId),
    ]);
    const placeNames = new Map(places.map(({ id, name }) => [id, name]));
    const friendNames = new Map(friends.map(({ id, name }) => [id, name]));
    return aliases.map(({ id, kind, words, targetId, uses, lastUsedAt }) => {
      const label =
        kind === 'place' ? (placeNames.get(targetId) ?? FORMER_PLACE) : (friendNames.get(targetId) ?? FORMER_FRIEND);
      return {
        id,
        kind: kind === 'place' ? 'place' : 'friend',
        words,
        target: { id: targetId, label },
        uses,
        lastUsedAt: lastUsedAt.toISOString(),
      };
    });
  }

  // Another User's alias is not found, as one that does not exist.
  async deleteMine(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.userAlias.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw aliasNotFound();
    }
  }

  // Everyone's standing of the words, counted again, makes, keeps or retires their alias.
  private async recount(words: string): Promise<void> {
    const { standings, allSupporters } = await this.standingsOf(words);
    const top = topOf(standings);
    const now = new Date();
    const aliases = await this.prisma.placeAlias.findMany({ where: { words, source: 'learned' } });
    const writes = aliases.map((alias) => {
      const standing = standings.find(({ placeId }) => placeId === alias.placeId) ?? {
        placeId: alias.placeId,
        supporters: 0,
        rejecters: 0,
      };
      const score = scoreOf(standing, alias.lastUsedAt, now);
      const active = standing.placeId === top?.placeId && qualifies(standing, allSupporters, score);
      const { supporters, rejecters } = standing;
      return this.prisma.placeAlias.update({
        where: { id: alias.id },
        data: { supporters, rejecters, score, retiredAt: active ? null : (alias.retiredAt ?? now) },
      });
    });
    if (top !== undefined && !aliases.some(({ placeId }) => placeId === top.placeId)) {
      const score = scoreOf(top, now, now);
      if (qualifies(top, allSupporters, score)) {
        const { placeId, supporters, rejecters } = top;
        // An upsert, as a count running at the same time may have made the row since it was read.
        writes.push(
          this.prisma.placeAlias.upsert({
            where: { words_placeId: { words, placeId } },
            create: { words, placeId, source: 'learned', supporters, rejecters, score, lastUsedAt: now },
            update: { supporters, rejecters, score, retiredAt: null },
          }),
        );
      }
    }
    if (writes.length > 0) {
      await this.prisma.$transaction(writes);
    }
  }

  // Each Place's standing for the words from resolution_events, in one query, and how many accounts chose anything for
  // them. Supporters are distinct accounts that were old enough when they chose, so an account counts once for the
  // words and a Place however often it chooses; rejecters are distinct accounts that said 아니에요 to it. Only Places
  // still in the catalog are counted.
  private async standingsOf(words: string): Promise<{ standings: Standing[]; allSupporters: number }> {
    const rows = await this.prisma.$queryRaw<StandingRow[]>`
      SELECT e.chosen_id AS "placeId",
        (count(DISTINCT e.user_id) FILTER (
          WHERE e.outcome <> 'rejected'
            AND e.created_at >= u.onboarded_at + make_interval(days => ${ACCOUNT_AGE_DAYS}::int)
        ))::int AS supporters,
        (count(DISTINCT e.user_id) FILTER (WHERE e.outcome = 'rejected'))::int AS rejecters
      FROM resolution_events e
      JOIN users u ON u.id = e.user_id
      WHERE e.kind = 'place'
        AND e.words = ${words}
        AND e.outcome IN ('chosen', 'edited', 'rejected')
        AND e.chosen_id IN (SELECT id FROM places)
      GROUP BY GROUPING SETS ((e.chosen_id), ())`;
    return {
      standings: rows.flatMap(({ placeId, supporters, rejecters }): Standing[] =>
        placeId === null ? [] : [{ placeId, supporters, rejecters }],
      ),
      allSupporters: rows.find(({ placeId }) => placeId === null)?.supporters ?? 0,
    };
  }
}
