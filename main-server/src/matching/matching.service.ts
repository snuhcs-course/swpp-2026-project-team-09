import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { type MatchingRefusal, QuestsService } from '../quests/quests.service.js';
import { UsersService } from '../users/users.service.js';
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

// The match server keeps the requests; this server decides whether one can be made and passes the calls on.
@Injectable()
export class MatchingService {
  constructor(
    private readonly matchServer: MatchServer,
    private readonly quests: QuestsService,
    private readonly users: UsersService,
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
      const { statusCode, error, message } = REFUSALS[refusal];
      throw new HttpException({ statusCode, error, code: refusal, message }, statusCode);
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
}
