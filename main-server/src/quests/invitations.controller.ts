import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type UserIdDto, userIdSchema } from './dto/quest-requests.dto.js';
import { QuestDto } from './dto/quest.dto.js';
import { WaitingDto, WaitingUserDto } from './dto/waiting.dto.js';
import { InvitationsService } from './invitations.service.js';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // A repeat is refused as an invitation already sent, so it takes no Idempotency-Key.
  @Post('quests/:questId/invitations')
  @HttpCode(HttpStatus.NO_CONTENT)
  invite(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: userIdSchema }) body: UserIdDto,
  ): Promise<void> {
    return this.invitations.invite(user.id, questId, body.userId);
  }

  @Get('quests/:questId/invitations')
  listSent(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
  ): Promise<WaitingUserDto[]> {
    return this.invitations.listSent(user.id, questId);
  }

  // A repeat is refused, as the invitation no longer waits, so it takes no Idempotency-Key.
  @Delete('quests/:questId/invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    return this.invitations.cancel(user.id, questId, id);
  }

  @Get('quest-invitations')
  list(@CurrentUser() user: SignedInUser): Promise<WaitingDto[]> {
    return this.invitations.list(user.id);
  }

  // A repeat is refused, as the invitation ended when the User entered.
  @Post('quest-invitations/:id/accept')
  accept(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<QuestDto> {
    return this.invitations.accept(user.id, id);
  }

  @Post('quest-invitations/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.invitations.decline(user.id, id);
  }
}
