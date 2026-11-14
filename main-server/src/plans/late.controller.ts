/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type OwnWay } from './dto/invitation-card.dto.js';
import { type LateBody, lateSchema } from './dto/late.dto.js';
import { LateService } from './late.service.js';

@Controller()
export class LateController {
  constructor(private readonly late: LateService) {}

  // A later report replaces the minutes, so a repeat needs no Idempotency-Key.
  @Post('quests/:questId/late')
  @HttpCode(HttpStatus.OK)
  report(
    @CurrentUser() user: SignedInUser,
    @Param('questId', { schema: z.uuid() }) questId: string,
    @Body({ schema: lateSchema }) body: LateBody,
  ): Promise<OwnWay> {
    return this.late.report(user.id, questId, body);
  }
}
