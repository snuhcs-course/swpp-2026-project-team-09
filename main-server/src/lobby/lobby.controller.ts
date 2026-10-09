/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { LobbyDto } from './dto/lobby.dto.js';
import { LobbyService } from './lobby.service.js';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobby: LobbyService) {}

  // A POST, so that the app can later send what it reports when it starts without changing the call. It creates
  // nothing, so it takes no Idempotency-Key.
  @Post()
  @HttpCode(HttpStatus.OK)
  enter(@CurrentUser() user: SignedInUser): Promise<LobbyDto> {
    return this.lobby.enter(user.id);
  }
}
