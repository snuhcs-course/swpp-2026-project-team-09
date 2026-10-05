import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
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
