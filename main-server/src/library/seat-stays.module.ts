/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { AssistantModule } from '../assistant/assistant.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PlacesModule } from '../places/places.module.js';
import { QuestsModule } from '../quests/quests.module.js';
import { TravelModule } from '../travel/travel.module.js';
import { RoomRequestSyncModule } from './room-request-sync.module.js';
import { SeatStaysController } from './seat-stays.controller.js';
import { SeatStaysService } from './seat-stays.service.js';

@Module({
  imports: [AssistantModule, NotificationsModule, PlacesModule, QuestsModule, RoomRequestSyncModule, TravelModule],
  controllers: [SeatStaysController],
  providers: [SeatStaysService],
})
export class SeatStaysModule {}
