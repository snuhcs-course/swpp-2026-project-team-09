/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type InterestDto, type MatchesDto, type WatchDto, watchSchema } from './dto/interest.dto.js';
import { InterestsService } from './interests.service.js';

@Controller('interests')
export class InterestsController {
  constructor(private readonly interests: InterestsService) {}

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<InterestDto[]> {
    return this.interests.list(user.id);
  }

  @Get('matches')
  matches(@CurrentUser() user: SignedInUser): Promise<MatchesDto> {
    return this.interests.matchesFor(user.id);
  }

  @Post()
  watch(@CurrentUser() user: SignedInUser, @Body({ schema: watchSchema }) body: WatchDto): Promise<InterestDto> {
    return this.interests.watch(user.id, body.words);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.interests.remove(user.id, id);
  }
}
