/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { databaseCauseOf } from '../../common/database-cause.js';
import { normaliseWords } from '../../common/normalise-words.js';
import { PrismaService } from '../../common/prisma.service.js';
import { type FriendDto } from '../../friends/dto/friends.dto.js';
import { FriendsService } from '../../friends/friends.service.js';
import { type PlaceAlias, type Prisma } from '../../generated/prisma/client.js';
import { PlaceMatcher } from '../../places/place-matcher.js';
import { PlacesService } from '../../places/places.service.js';
import { type ChoiceKind } from '../feature.js';
import { ResolutionEventsService } from '../resolution-events.service.js';
import { aliasOf, type Chain, chainOf, type Decision, sourceOf, standingOf } from './alias-chain.js';
import { chainRows } from './alias-rows.js';
import { MIN_SCORE, scoreOf, SESSION_GAP_MINUTES } from './alias-rules.js';
import { type AliasDto } from './aliases.dto.js';
import { type AliasKind, PersonalAliases } from './personal-aliases.js';

// The names of a target that is gone: nothing more of a former Friend is shown.
const FORMER_FRIEND = '친구';
const FORMER_PLACE = '장소';

const MINUTE_MS = 60 * 1000;

const aliasNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'ALIAS_NOT_FOUND',
    message: 'The User taught no such alias.',
  });

// What the Assistant learns from the User's choices (P07 tickets 03 and 06): each User's own aliases at once, and
// every User's Place aliases from the absorbing Markov chain over everyone's sessions (alias-chain.ts), counted again
// after each session that may have changed them.
@Injectable()
export class AliasesService {
  private readonly logger = new Logger(AliasesService.name);
  private readonly personal: PersonalAliases;

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolutionEvents: ResolutionEventsService,
    private readonly places: PlacesService,
    private readonly matcher: PlaceMatcher,
    private readonly friends: FriendsService,
  ) {
    this.personal = new PersonalAliases(prisma);
  }

  // The User chose the target for their words, from a chip or by changing a Proposal's Place, and the event is
  // recorded: their own alias is made, or chosen once more. Events teach nothing, as they end. A failure is logged, and
  // the reply stands. Everyone's aliases are counted again once the run is over (recountSession).
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
    } catch (error) {
      this.logger.warn(`An alias was not learned: ${databaseCauseOf(error)}`);
    }
  }

  // After a run that chose, edited or resolved a Place: everyone's alias of every words of the User's current session
  // is counted again, so that words answered none learn from the Place the User then reached. The rows keep the
  // database's own time, so the session is read by it. A failure is logged, and the reply stands.
  async recountSession(userId: string): Promise<void> {
    try {
      const now = new Date();
      const recent = await this.prisma.resolutionEvent.findMany({
        where: { userId, kind: 'place', createdAt: { gte: new Date(now.getTime() - SESSION_GAP_MINUTES * MINUTE_MS) } },
        select: { words: true, outcome: true, chosenId: true },
      });
      const words = new Set(recent.map((row) => row.words).filter((text) => text !== ''));
      if (words.size === 0) {
        return;
      }
      const chain = chainOf(await chainRows(this.prisma));
      for (const text of words) {
        const chosen = recent
          .filter((row) => row.words === text && (row.outcome === 'chosen' || row.outcome === 'edited'))
          .flatMap((row) => (row.chosenId === null ? [] : [row.chosenId]));
        // oxlint-disable-next-line no-await-in-loop -- each words' rows are written in their own transaction
        await this.recount(text, chain, now, new Set(chosen));
      }
    } catch (error) {
      this.logger.warn(`Everyone's aliases were not counted again: ${databaseCauseOf(error)}`);
    }
  }

  // 아니에요: the User said an answer read from an alias was wrong. It is recorded as a rejected event, their own alias
  // for it is deleted, and for a Place everyone's alias of the words is counted again.
  async reject(userId: string, kind: AliasKind, words: string, targetId: string): Promise<void> {
    const key = normaliseWords(words);
    await this.resolutionEvents.rejected(userId, kind, key, targetId);
    await this.prisma.userAlias.deleteMany({ where: { userId, kind, words: key, targetId } });
    if (kind === 'place') {
      await this.recount(key, chainOf(await chainRows(this.prisma)), new Date(), new Set());
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

  // The chain's decision for the words makes, keeps or retires everyone's alias of them. A choice of an alias's Place
  // is a use of it, which resets its decay, so that a choice brings back an alias decay retired.
  private async recount(words: string, chain: Chain, now: Date, chosen: ReadonlySet<string>): Promise<void> {
    const ruled = await this.matcher.byRule(words);
    const decision = aliasOf(
      chain,
      words,
      sourceOf(
        words,
        ruled.places.map(({ id }) => id),
      ),
    );
    const aliases = await this.prisma.placeAlias.findMany({ where: { words, source: 'learned' } });
    const writes: Prisma.PrismaPromise<PlaceAlias>[] = aliases.map((alias) => {
      const standing = standingOf(chain, decision, words, alias.placeId);
      const lastUsedAt = chosen.has(alias.placeId) ? now : alias.lastUsedAt;
      const score = scoreOf(standing, lastUsedAt, now);
      const active = decision.alias?.placeId === alias.placeId && score >= MIN_SCORE;
      const { supporters, rejecters, success } = standing;
      return this.prisma.placeAlias.update({
        where: { id: alias.id },
        data: {
          supporters,
          rejecters,
          score,
          success,
          ownSuccess: decision.ownSuccess,
          lastUsedAt,
          retiredAt: active ? null : (alias.retiredAt ?? now),
        },
      });
    });
    const made = this.make(
      words,
      decision,
      now,
      aliases.map(({ placeId }) => placeId),
    );
    if (made !== null) {
      writes.push(made);
    }
    if (writes.length > 0) {
      await this.prisma.$transaction(writes);
    }
  }

  // The row of an alias the chain picked for the first time, when its score allows. An upsert, as a count running at
  // the same time may have made the row since it was read.
  private make(
    words: string,
    { alias, ownSuccess }: Decision,
    now: Date,
    known: readonly string[],
  ): Prisma.PrismaPromise<PlaceAlias> | null {
    if (alias === null || known.includes(alias.placeId) || scoreOf(alias, now, now) < MIN_SCORE) {
      return null;
    }
    const { placeId, supporters, rejecters, success } = alias;
    const score = scoreOf(alias, now, now);
    return this.prisma.placeAlias.upsert({
      where: { words_placeId: { words, placeId } },
      create: { words, placeId, source: 'learned', supporters, rejecters, score, success, ownSuccess, lastUsedAt: now },
      update: { supporters, rejecters, score, success, ownSuccess, retiredAt: null },
    });
  }
}
