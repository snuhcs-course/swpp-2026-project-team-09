// AI-generated with Claude Opus 5.5, 2026-10-01, prompted by fyoon46, reviewed by TaeHyun79 in #18
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
