import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type UserIdDto, userIdSchema } from './dto/quest-requests.dto.js';
import { QuestDto } from './dto/quest.dto.js';
import { WaitingDto } from './dto/waiting.dto.js';
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
