import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { type MatchingCandidate, type MatchingRefusal, QuestsService } from '../quests/quests.service.js';
import { UsersService } from '../users/users.service.js';
import { MatchQuestDto, type MatchQuestRequestDto, StandingAnswerDto } from './dto/match-server-calls.dto.js';
import { type AskForMatchingDto, MatchingRequestDto, matchingRequestSchema } from './dto/matching-request.dto.js';
import { MatchServer } from './match-server.js';

const SIZES = { min: 2, max: 4 };

const REFUSALS: Record<MatchingRefusal, { statusCode: HttpStatus; error: string; message: string }> = {
  GLOBAL_EVENT_NOT_FOUND: {
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'No such Global Event is published.',
  },
  GLOBAL_EVENT_STARTED: {
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'The Global Event has started.',
  },
  SHARED_QUEST_HELD: {
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'The User holds a Shared Quest for this Global Event already.',
  },
};

function refusalOf(refusal: MatchingRefusal): HttpException {
  const { statusCode, error, message } = REFUSALS[refusal];
  return new HttpException({ statusCode, error, code: refusal, message }, statusCode);
}

// The match server keeps the requests; this server decides whether one can be made and passes the calls on.
@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchServer: MatchServer,
    private readonly quests: QuestsService,
    private readonly users: UsersService,
    private readonly signals: SignalsService,
  ) {}

  async ask(userId: string, { globalEventId, size }: AskForMatchingDto): Promise<MatchingRequestDto> {
    if (size < SIZES.min || size > SIZES.max) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'MATCHING_SIZE_OUT_OF_RANGE',
        message: `A group has ${SIZES.min} to ${SIZES.max} Users.`,
      });
    }
    const [refusal] = await this.quests.matchingRefusals([{ userId, globalEventId }]);
    if (refusal !== null) {
      throw refusalOf(refusal);
    }
    const { hashtags } = await this.users.findById(userId);
    return this.matchServer.call('POST', `/users/${userId}/matching-requests`, matchingRequestSchema, {
      globalEventId,
      size,
      hashtags,
    });
  }

  async withdraw(userId: string, globalEventId: string): Promise<void> {
    await this.matchServer.call('POST', `/users/${userId}/matching-requests/${globalEventId}/withdraw`, z.null());
  }

  read(userId: string, globalEventId: string): Promise<MatchingRequestDto> {
    return this.matchServer.call('GET', `/users/${userId}/matching-requests/${globalEventId}`, matchingRequestSchema);
  }

  listOpen(userId: string): Promise<MatchingRequestDto[]> {
    return this.matchServer.call('GET', `/users/${userId}/matching-requests`, z.array(matchingRequestSchema));
  }

  async standing(requests: readonly MatchingCandidate[]): Promise<StandingAnswerDto> {
    const refusals = await this.quests.matchingRefusals(requests);
    return { standing: requests.filter((_, index) => refusals[index] === null) };
  }

  // The match's Shared Quest, created once: a repeat answers the Quest of the first. The Users are locked in id order,
  // as attending locks one, so that an attend or another match at the same moment runs before or after.
  async createQuest(matchId: string, { globalEventId, userIds }: MatchQuestRequestDto): Promise<MatchQuestDto> {
    const inIdOrder = userIds.toSorted();
    const { questId, holderIds, created } = await this.prisma.$transaction(async (tx) => {
      for (const userId of inIdOrder) {
        // oxlint-disable-next-line no-await-in-loop -- one after another, in id order
        await this.users.lock(userId, tx);
      }
      const existing = await this.quests.forMatch(matchId, tx);
      if (existing !== null) {
        return { questId: existing, holderIds: await this.quests.holderIds(existing, tx), created: false };
      }
      // The Global Event's refusals come before a User's and are the same for every User.
      const candidates = userIds.map((userId) => ({ userId, globalEventId }));
      const eventRefusal = (await this.quests.matchingRefusals(candidates, tx)).find(
        (refusal) => refusal === 'GLOBAL_EVENT_NOT_FOUND' || refusal === 'GLOBAL_EVENT_STARTED',
      );
      if (eventRefusal !== undefined) {
        throw refusalOf(eventRefusal);
      }
      const free: string[] = [];
      for (const userId of inIdOrder) {
        // oxlint-disable-next-line no-await-in-loop -- one transaction runs one query at a time
        if (await this.quests.freeForSharedQuest(userId, globalEventId, tx)) {
          free.push(userId);
        }
      }
      // Throwing rolls back the Quests held alone that were deleted for it.
      if (free.length < 2) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'MATCH_TOO_SMALL',
          message: 'Fewer than two of the matched Users are free for a Shared Quest of this Global Event.',
        });
      }
      const globalEvent = await tx.globalEvent.findUniqueOrThrow({ where: { id: globalEventId } });
      return {
        questId: await this.quests.createForGlobalEvent(globalEvent, free, tx, matchId),
        holderIds: free,
        created: true,
      };
    });
    if (created) {
      this.signals.send(holderIds, 'matching-changed');
      this.signals.send(holderIds, 'quests-changed');
    }
    return { questId, holderIds };
  }
}
