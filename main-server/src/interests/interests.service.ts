/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, type ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { GlobalEventState, JoinPolicy, type Prisma, type WatchedInterest } from '../generated/prisma/client.js';
import { notEnded } from '../global-events/global-events.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { RecruitingService } from '../quests/recruiting.service.js';
import { conflict, notFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { type InterestDto, type MatchDto, type MatchesDto, watchSchema } from './dto/interest.dto.js';
import { normalisedTopic, normalisedTopics } from './topics.js';
import { TopicsReader } from './topics-reader.js';

export const INTERESTS_MAX = 20;

export const interestsFull = (): ConflictException =>
  conflict('INTERESTS_FULL', `A User watches at most ${String(INTERESTS_MAX)} interests.`);

function toInterestDto({ id, words, topics, createdAt }: WatchedInterest): InterestDto {
  return { id, words, topics, createdAt: createdAt.toISOString() };
}

function matchesOf(found: { id: string; topics: string[] }[], watched: ReadonlySet<string>): MatchDto[] {
  return found.map(({ id, topics }) => ({ id, watched: topics.some((topic) => watched.has(topic)) }));
}

// The interests a User asked the Assistant to watch, and what matches them (README.md: Interests).
@Injectable()
export class InterestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reader: TopicsReader,
    private readonly users: UsersService,
    private readonly recruiting: RecruitingService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  // Keeps the words with their topics, or answers the interest of the same words the User already has.
  async watch(userId: string, said: string): Promise<InterestDto> {
    const parsed = watchSchema.shape.words.safeParse(said);
    if (!parsed.success) {
      throw new BadRequestException('words must be 1 to 60 characters');
    }
    const words = parsed.data;
    const same = await this.sameWords(userId, words);
    if (same !== null) {
      return toInterestDto(same);
    }
    if ((await this.prisma.watchedInterest.count({ where: { userId } })) >= INTERESTS_MAX) {
      throw interestsFull();
    }
    const read = await this.reader.read(words);
    const topics = read.length === 0 ? normalisedTopics([words]) : read;
    const kept = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      const again = await this.sameWords(userId, words, tx);
      if (again !== null) {
        return again;
      }
      if ((await tx.watchedInterest.count({ where: { userId } })) >= INTERESTS_MAX) {
        throw interestsFull();
      }
      return tx.watchedInterest.create({ data: { userId, words, topics, createdAt: this.clock.now() } });
    });
    return toInterestDto(kept);
  }

  // The newest first.
  async list(userId: string): Promise<InterestDto[]> {
    const interests = await this.prisma.watchedInterest.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return interests.map((interest) => toInterestDto(interest));
  }

  async remove(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.watchedInterest.deleteMany({ where: { id, userId } });
    if (count === 0) {
      throw notFound('INTEREST_NOT_FOUND', 'This User watches no such interest.');
    }
  }

  // Removes each interest whose words or one of whose topics are the words, and answers the words of those removed.
  async unwatch(userId: string, said: string): Promise<string[]> {
    const topic = normalisedTopic(said);
    const removed = (await this.prisma.watchedInterest.findMany({ where: { userId } })).filter(
      ({ words, topics }) => normalisedTopic(words) === topic || topics.includes(topic),
    );
    await this.prisma.watchedInterest.deleteMany({ where: { id: { in: removed.map(({ id }) => id) }, userId } });
    return removed.map(({ words }) => words);
  }

  // The published events that have not ended and the recruiting Quests that share a topic with the User's hashtags or
  // watched interests.
  async matchesFor(userId: string): Promise<MatchesDto> {
    const { hashtags } = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const interests = await this.prisma.watchedInterest.findMany({ where: { userId } });
    const watched = new Set(interests.flatMap(({ topics }) => topics));
    const all = [...new Set([...normalisedTopics(hashtags), ...watched])];
    if (all.length === 0) {
      return { globalEvents: [], quests: [] };
    }
    const events = await this.prisma.globalEvent.findMany({
      where: { state: GlobalEventState.published, topics: { hasSome: all }, AND: [notEnded(this.clock.now())] },
      orderBy: [{ startsAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      select: { id: true, topics: true },
    });
    const quests = await this.prisma.quest.findMany({
      where: { topics: { hasSome: all }, joinPolicy: { in: [JoinPolicy.open, JoinPolicy.approval] } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, topics: true },
    });
    const listed = new Set(
      (
        await this.recruiting.listedAmong(
          userId,
          quests.map(({ id }) => id),
        )
      ).map(({ id }) => id),
    );
    return {
      globalEvents: matchesOf(events, watched),
      quests: matchesOf(
        quests.filter(({ id }) => listed.has(id)),
        watched,
      ),
    };
  }

  private async sameWords(
    userId: string,
    words: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<WatchedInterest | null> {
    const interests = await tx.watchedInterest.findMany({ where: { userId } });
    return interests.find((interest) => normalisedTopic(interest.words) === normalisedTopic(words)) ?? null;
  }
}
