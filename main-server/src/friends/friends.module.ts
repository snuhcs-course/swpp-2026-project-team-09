/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

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
