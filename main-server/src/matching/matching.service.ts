// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #45 #48
import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { JoinPolicy } from '../generated/prisma/client.js';
import {
  type MatchingCandidate,
  type MatchingRefusal,
  MatchingQuestsService,
} from '../quests/matching-quests.service.js';
import { QuestsService } from '../quests/quests.service.js';
import { RecruitingService } from '../quests/recruiting.service.js';
import { conflict } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import {
  EligibleAnswerDto,
  type EligibleQuestionDto,
  MatchQuestDto,
  type MatchQuestRequestDto,
  type PlacementDto,
  StandingAnswerDto,
} from './dto/match-server-calls.dto.js';
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
    private readonly matchingQuests: MatchingQuestsService,
    private readonly recruiting: RecruitingService,
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
    const [refusal] = await this.matchingQuests.matchingRefusals([{ userId, globalEventId }]);
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
    const refusals = await this.matchingQuests.matchingRefusals(requests);
    return { standing: requests.filter((_, index) => refusals[index] === null) };
  }

  async eligibleQuests({ pools }: EligibleQuestionDto): Promise<EligibleAnswerDto> {
    const quests = await this.matchingQuests.eligibleQuests(pools);
    return {
      quests: quests.map(({ id, globalEventId, capacity, freePlaces, holderIds, createdAt }) => ({
        id,
        globalEventId,
        capacity,
        freePlaces,
        holderIds,
        createdAt: createdAt.toISOString(),
      })),
    };
  }

  // Makes the User a Holder under the rules of entering a Quest, as long as the Quest is Open and its capacity is the
  // size the User asked for. A User who holds the Quest already, such as one who joined it after the match server read
  // the eligible Quests, is answered as entered. The User is locked before that check, as entering locks it.
  async place({ questId, userId, size }: PlacementDto): Promise<MatchQuestDto> {
    const { holderIds, entered } = await this.prisma.$transaction(async (tx) => {
      await this.users.lock(userId, tx);
      if ((await tx.questHolder.count({ where: { questId, userId } })) > 0) {
        return { holderIds: await this.quests.holderIds(questId, tx), entered: false };
      }
      const entering = await this.recruiting.enter(questId, userId, tx, ({ joinPolicy, capacity }) => {
        if (joinPolicy !== JoinPolicy.open) {
          throw conflict('QUEST_NOT_OPEN', 'Matching places Users into Open Quests only.');
        }
        if (capacity !== size) {
          throw conflict('QUEST_CAPACITY_DIFFERS', "The Quest's capacity is not the size the User asked for.");
        }
      });
      return { holderIds: entering, entered: true };
    });
    if (entered) {
      this.signals.send([userId], 'matching-changed');
      this.signals.send(holderIds, 'quests-changed');
    }
    return { questId, holderIds };
  }

  // The match's Shared Quest, created once: a repeat answers the Quest of the first. The Users are locked in id order,
  // as attending locks one, so that an attend or another match at the same moment runs before or after. The match server
  // names the Users in the order their requests arrived, which the Holders keep, so the earliest free User leads.
  async createQuest(matchId: string, { globalEventId, userIds }: MatchQuestRequestDto): Promise<MatchQuestDto> {
    const inIdOrder = userIds.toSorted();
    const { questId, holderIds, created } = await this.prisma.$transaction(async (tx) => {
      for (const userId of inIdOrder) {
        // oxlint-disable-next-line no-await-in-loop -- one after another, in id order
        await this.users.lock(userId, tx);
      }
      const existing = await this.matchingQuests.forMatch(matchId, tx);
      if (existing !== null) {
        return { questId: existing, holderIds: await this.quests.holderIds(existing, tx), created: false };
      }
      // The Global Event's refusals come before a User's and are the same for every User.
      const candidates = userIds.map((userId) => ({ userId, globalEventId }));
      const eventRefusal = (await this.matchingQuests.matchingRefusals(candidates, tx)).find(
        (refusal) => refusal === 'GLOBAL_EVENT_NOT_FOUND' || refusal === 'GLOBAL_EVENT_STARTED',
      );
      if (eventRefusal !== undefined) {
        throw refusalOf(eventRefusal);
      }
      const free: string[] = [];
      for (const userId of userIds) {
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
      const settings = { matchId, capacity: userIds.length, joinPolicy: JoinPolicy.closed };
      return {
        questId: await this.quests.createForGlobalEvent(globalEvent, free, tx, settings),
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
