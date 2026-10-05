import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { type AskDto, askSchema, MatchingRequestDto } from './dto/matching-request.dto.js';
import { MatchingService } from './matching.service.js';

// The main server's calls about a User's requests for Matching (README.md: Routes for the main server).
@Controller('users/:userId/matching-requests')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Post()
  ask(
    @Param('userId', { schema: z.uuid() }) userId: string,
    @Body({ schema: askSchema }) body: AskDto,
  ): Promise<MatchingRequestDto> {
    return this.matching.ask(userId, body);
  }

  @Get()
  listOpen(@Param('userId', { schema: z.uuid() }) userId: string): Promise<MatchingRequestDto[]> {
    return this.matching.listOpen(userId);
  }

  @Get(':globalEventId')
  read(
    @Param('userId', { schema: z.uuid() }) userId: string,
    @Param('globalEventId', { schema: z.uuid() }) globalEventId: string,
  ): Promise<MatchingRequestDto> {
    return this.matching.read(userId, globalEventId);
  }

  @Post(':globalEventId/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(
    @Param('userId', { schema: z.uuid() }) userId: string,
    @Param('globalEventId', { schema: z.uuid() }) globalEventId: string,
  ): Promise<void> {
    return this.matching.withdraw(userId, globalEventId);
  }
}
