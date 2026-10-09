// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
import { Body, Controller, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { MatchServerOnly } from '../common/match-server-only.decorator.js';
import { MatchQuestDto, type MatchQuestRequestDto, matchQuestRequestSchema } from './dto/match-server-calls.dto.js';
import { MatchingService } from './matching.service.js';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matching: MatchingService) {}

  // The match server repeats it until it is answered, and each repeat answers the Quest created the first time.
  @Post(':matchId/quest')
  @MatchServerOnly()
  createQuest(
    @Param('matchId', { schema: z.uuid() }) matchId: string,
    @Body({ schema: matchQuestRequestSchema }) body: MatchQuestRequestDto,
  ): Promise<MatchQuestDto> {
    return this.matching.createQuest(matchId, body);
  }
}
