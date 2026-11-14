/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Controller, Get, Param, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import {
  type InvitationCardDto,
  type InvitationCardQuery,
  invitationCardQuerySchema,
} from './dto/invitation-card.dto.js';
import { InvitationCardService } from './invitation-card.service.js';

@Controller()
export class InvitationCardController {
  constructor(private readonly cards: InvitationCardService) {}

  @Get('quest-invitations/:id')
  read(
    @CurrentUser() user: SignedInUser,
    @Param('id', { schema: z.uuid() }) id: string,
    @Query({ schema: invitationCardQuerySchema }) { latitude, longitude }: InvitationCardQuery,
  ): Promise<InvitationCardDto> {
    const position = latitude === undefined || longitude === undefined ? null : { latitude, longitude };
    return this.cards.read(user.id, id, position);
  }
}
