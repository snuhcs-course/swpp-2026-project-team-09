/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../../common/current-user.decorator.js';
import {
  type SuggestionAnswerDto,
  type SuggestionOutcomeDto,
  suggestionOutcomeSchema,
  type SuggestionQuery,
  suggestionQuerySchema,
} from './dto/suggestion.dto.js';
import { SuggestionsService } from './suggestions.service.js';

@Controller('assistant')
export class SuggestionsController {
  constructor(private readonly suggestions: SuggestionsService) {}

  // Decided without the model. Every suggestion answered is logged as an impression, so no answer is kept.
  @Get('suggestion')
  @Header('Cache-Control', 'no-store')
  suggest(
    @CurrentUser() user: SignedInUser,
    @Query({ schema: suggestionQuerySchema }) query: SuggestionQuery,
  ): Promise<SuggestionAnswerDto> {
    return this.suggestions.suggest(user.id, query);
  }

  // A repeat of the same outcome changes nothing, so it takes no Idempotency-Key.
  @Post('suggestions/:id/outcome')
  @HttpCode(HttpStatus.NO_CONTENT)
  recordOutcome(
    @CurrentUser() user: SignedInUser,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: suggestionOutcomeSchema }) body: SuggestionOutcomeDto,
  ): Promise<void> {
    return this.suggestions.recordOutcome(user.id, id, body);
  }
}
