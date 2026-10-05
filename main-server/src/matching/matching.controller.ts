import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { MatchServerOnly } from '../common/match-server-only.decorator.js';
import {
  EligibleAnswerDto,
  type EligibleQuestionDto,
  eligibleQuestionSchema,
  MatchQuestDto,
  type PlacementDto,
  placementSchema,
  StandingAnswerDto,
  type StandingQuestionDto,
  standingQuestionSchema,
} from './dto/match-server-calls.dto.js';
import { type AskForMatchingDto, askForMatchingSchema, MatchingRequestDto } from './dto/matching-request.dto.js';
import { MatchingService } from './matching.service.js';

@Controller('matching-requests')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  // A repeat is refused while the first request waits, so it takes no Idempotency-Key.
  @Post()
  ask(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: askForMatchingSchema }) body: AskForMatchingDto,
  ): Promise<MatchingRequestDto> {
    return this.matching.ask(user.id, body);
  }

  // The match server's question at the start of a round. It stores nothing, so it answers 200.
  @Post('standing')
  @MatchServerOnly()
  @HttpCode(HttpStatus.OK)
  standing(@Body({ schema: standingQuestionSchema }) { requests }: StandingQuestionDto): Promise<StandingAnswerDto> {
    return this.matching.standing(requests);
  }

  // The match server's question after the standing one. It stores nothing, so it answers 200.
  @Post('eligible-quests')
  @MatchServerOnly()
  @HttpCode(HttpStatus.OK)
  eligibleQuests(@Body({ schema: eligibleQuestionSchema }) body: EligibleQuestionDto): Promise<EligibleAnswerDto> {
    return this.matching.eligibleQuests(body);
  }

  @Post('placements')
  @MatchServerOnly()
  place(@Body({ schema: placementSchema }) body: PlacementDto): Promise<MatchQuestDto> {
    return this.matching.place(body);
  }

  @Get()
  listOpen(@CurrentUser() user: SignedInUser): Promise<MatchingRequestDto[]> {
    return this.matching.listOpen(user.id);
  }

  @Get(':globalEventId')
  read(
    @CurrentUser() user: SignedInUser,
    @Param('globalEventId', { schema: z.uuid() }) globalEventId: string,
  ): Promise<MatchingRequestDto> {
    return this.matching.read(user.id, globalEventId);
  }

  @Post(':globalEventId/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(
    @CurrentUser() user: SignedInUser,
    @Param('globalEventId', { schema: z.uuid() }) globalEventId: string,
  ): Promise<void> {
    return this.matching.withdraw(user.id, globalEventId);
  }
}
