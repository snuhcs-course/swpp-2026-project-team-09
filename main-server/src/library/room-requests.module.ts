/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { RoomRequestSyncModule } from './room-request-sync.module.js';
import { RoomRequestsController } from './room-requests.controller.js';
import { RoomBookingsService } from './room-bookings.service.js';
import { RoomConsentsService } from './room-consents.service.js';
import { RoomRequestsService } from './room-requests.service.js';

@Module({
  imports: [QuestsModule, FriendsModule, UsersModule, RoomRequestSyncModule],
  controllers: [RoomRequestsController],
  providers: [RoomRequestsService, RoomConsentsService, RoomBookingsService],
})
export class RoomRequestsModule {}
