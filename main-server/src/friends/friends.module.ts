// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by fyoon46, reviewed by TaeHyun79 in #38 #42
import { Module } from '@nestjs/common';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminFriendsController } from './admin-friends.controller.js';
import { AdminFriendsService } from './admin-friends.service.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';

@Module({
  imports: [UsersModule, LocationSharingModule],
  controllers: [FriendsController, AdminFriendsController],
  providers: [FriendsService, AdminFriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
