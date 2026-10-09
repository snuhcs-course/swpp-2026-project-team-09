/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { LobbyController } from './lobby.controller.js';
import { LobbyService } from './lobby.service.js';

@Module({
  imports: [UsersModule],
  controllers: [LobbyController],
  providers: [LobbyService],
})
export class LobbyModule {}
