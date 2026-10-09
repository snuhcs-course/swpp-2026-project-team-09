/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { InvitationDto } from './dto/invitations.dto.js';
import { type UserIdDto, userIdSchema } from './dto/party-requests.dto.js';
import { PartyDto } from './dto/party.dto.js';
import { InvitationsService } from './invitations.service.js';

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  // A repeat is refused as an invitation already sent, so it takes no Idempotency-Key.
  @Post('parties/mine/invitations')
  @HttpCode(HttpStatus.NO_CONTENT)
  invite(@CurrentUser() user: SignedInUser, @Body({ schema: userIdSchema }) body: UserIdDto): Promise<void> {
    return this.invitations.invite(user.id, body.userId);
  }

  @Get('party-invitations')
  list(@CurrentUser() user: SignedInUser): Promise<InvitationDto[]> {
    return this.invitations.list(user.id);
  }

  // A repeat is refused as a User in a Party already.
  @Post('party-invitations/:id/accept')
  accept(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<PartyDto> {
    return this.invitations.accept(user.id, id);
  }

  @Post('party-invitations/:id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.invitations.decline(user.id, id);
  }
}
