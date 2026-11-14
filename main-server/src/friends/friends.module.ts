/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { RoomRequestSyncModule } from '../library/room-request-sync.module.js';
import { LocationSharingModule } from '../location-sharing/location-sharing.module.js';
import { PlacesModule } from '../places/places.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminFriendsController } from './admin-friends.controller.js';
import { AdminFriendsService } from './admin-friends.service.js';
import { FriendViewService } from './friend-view.service.js';
import { FriendsController } from './friends.controller.js';
import { FriendsService } from './friends.service.js';

@Module({
  imports: [UsersModule, LocationSharingModule, PlacesModule, RoomRequestSyncModule],
  controllers: [FriendsController, AdminFriendsController],
  providers: [FriendsService, AdminFriendsService, FriendViewService],
  exports: [FriendsService, FriendViewService],
})
export class FriendsModule {}
