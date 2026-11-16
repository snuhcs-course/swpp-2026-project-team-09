/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type AskedDto, askedSchema, type FriendLevelDto, friendLevelSchema } from './dto/friends.dto.js';
import { FriendAsksService } from './friend-asks.service.js';

// What the app keeps of the two moments it asks a User at, and the lowering that the Master Switch's question offers.
// Each repeat changes nothing, so none takes an Idempotency-Key.
@Controller()
export class FriendAsksController {
  constructor(private readonly asks: FriendAsksService) {}

  @Post('friends/asked')
  @HttpCode(HttpStatus.NO_CONTENT)
  record(@CurrentUser() user: SignedInUser, @Body({ schema: askedSchema }) body: AskedDto): Promise<void> {
    return this.asks.record(user.id, body);
  }

  @Post('users/me/master-switch/asked')
  @HttpCode(HttpStatus.NO_CONTENT)
  recordMasterOff(@CurrentUser() user: SignedInUser): Promise<void> {
    return this.asks.recordMasterOff(user.id);
  }

  @Put('users/me/friend-levels')
  @HttpCode(HttpStatus.NO_CONTENT)
  lowerAll(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: friendLevelSchema }) body: FriendLevelDto,
  ): Promise<void> {
    return this.asks.lowerAll(user.id, body.level);
  }
}
