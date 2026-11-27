/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { FriendsModule } from '../friends/friends.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { UsersModule } from '../users/users.module.js';
import { RoomAnswersService } from './room-answers.service.js';
import { RoomRequestSyncModule } from './room-request-sync.module.js';
import { RoomRequestsController } from './room-requests.controller.js';
import { RoomBookingsService } from './room-bookings.service.js';
import { RoomConsentsService } from './room-consents.service.js';
import { RoomRequestsService } from './room-requests.service.js';

// AssistantModule gives the study answer together, which a request's answer is rebuilt with.
@Module({
  imports: [AssistantModule, QuestsModule, FriendsModule, UsersModule, RoomRequestSyncModule],
  controllers: [RoomRequestsController],
  providers: [RoomRequestsService, RoomConsentsService, RoomBookingsService, RoomAnswersService],
})
export class RoomRequestsModule {}
