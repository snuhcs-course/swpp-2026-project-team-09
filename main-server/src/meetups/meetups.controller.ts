/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { MeetupDto, MeetupsDto, type ProposeMeetupDto, proposeMeetupSchema } from './dto/meetups.dto.js';
import { MeetupsService } from './meetups.service.js';

// No route edits a Meetup: the proposer withdraws it and proposes another.
@Controller('meetups')
export class MeetupsController {
  constructor(private readonly meetups: MeetupsService) {}

  @Post()
  @Idempotent({ required: true })
  propose(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: proposeMeetupSchema }) body: ProposeMeetupDto,
  ): Promise<MeetupDto> {
    return this.meetups.propose(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<MeetupsDto> {
    return this.meetups.list(user.id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  accept(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.meetups.accept(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  decline(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.meetups.decline(user.id, id);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.meetups.withdraw(user.id, id);
  }
}
