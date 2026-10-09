/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import {
  type AskToJoinDto,
  askToJoinSchema,
  ReceivedJoinRequestDto,
  SentJoinRequestDto,
} from './dto/join-requests.dto.js';
import { JoinRequestsService } from './join-requests.service.js';

@Controller()
export class JoinRequestsController {
  constructor(private readonly joinRequests: JoinRequestsService) {}

  // A repeat is refused as a request already sent, so it takes no Idempotency-Key.
  @Post('party-join-requests')
  ask(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: askToJoinSchema }) body: AskToJoinDto,
  ): Promise<SentJoinRequestDto> {
    return this.joinRequests.ask(user.id, body.partyId);
  }

  @Get('party-join-requests')
  listSent(@CurrentUser() user: SignedInUser): Promise<SentJoinRequestDto[]> {
    return this.joinRequests.listSent(user.id);
  }

  @Post('party-join-requests/:id/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.joinRequests.withdraw(user.id, id);
  }

  @Get('parties/mine/join-requests')
  listReceived(@CurrentUser() user: SignedInUser): Promise<ReceivedJoinRequestDto[]> {
    return this.joinRequests.listReceived(user.id);
  }

  @Post('parties/mine/join-requests/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.joinRequests.accept(user.id, id);
  }

  @Post('parties/mine/join-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.joinRequests.decline(user.id, id);
  }
}
