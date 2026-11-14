/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type PushTokenDto, pushTokenSchema } from './dto/push-token.dto.js';
import { PushService } from './push.service.js';

@Controller()
export class PushController {
  constructor(private readonly push: PushService) {}

  @Put('users/me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  register(@CurrentUser() user: SignedInUser, @Body({ schema: pushTokenSchema }) body: PushTokenDto): Promise<void> {
    return this.push.register(user.sessionId, body.token);
  }
}
