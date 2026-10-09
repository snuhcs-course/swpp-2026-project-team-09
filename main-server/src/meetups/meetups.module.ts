// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #44
import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { MeetupsController } from './meetups.controller.js';
import { MeetupsService } from './meetups.service.js';

@Module({
  imports: [UsersModule, FriendsModule, QuestsModule],
  controllers: [MeetupsController],
  providers: [MeetupsService],
})
export class MeetupsModule {}
