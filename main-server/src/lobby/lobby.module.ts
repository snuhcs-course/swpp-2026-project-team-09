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
