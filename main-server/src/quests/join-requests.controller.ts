/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import {
  type AskToJoinDto,
  askToJoinSchema,
  JoinRequestUserDto,
  QuestRemovalDto,
  WaitingDto,
} from './dto/waiting.dto.js';
import { JoinRequestsService } from './join-requests.service.js';

@Controller()
export class JoinRequestsController {
  constructor(private readonly joinRequests: JoinRequestsService) {}

  // A repeat is refused as a request already sent, so it takes no Idempotency-Key.
  @Post('quest-join-requests')
  ask(@CurrentUser() user: SignedInUser, @Body({ schema: askToJoinSchema }) body: AskToJoinDto): Promise<WaitingDto> {
    return this.joinRequests.ask(user.id, body.questId);
  }

  @Get('quest-join-requests')
  listSent(@CurrentUser() user: SignedInUser): Promise<WaitingDto[]> {
    return this.joinRequests.listSent(user.id);
  }

  @Post('quest-join-requests/:id/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.joinRequests.withdraw(user.id, id);
  }

  @Get('quest-removals')
  listRemovals(@CurrentUser() user: SignedInUser): Promise<QuestRemovalDto[]> {
    return this.joinRequests.listRemovals(user.id);
  }

  @Get('quests/:questId/join-requests')
  listReceived(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
  ): Promise<JoinRequestUserDto[]> {
    return this.joinRequests.listReceived(user.id, questId);
  }

  @Post('quests/:questId/join-requests/:id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.joinRequests.accept(user.id, questId, id);
  }

  @Post('quests/:questId/join-requests/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.joinRequests.decline(user.id, questId, id);
  }
}
