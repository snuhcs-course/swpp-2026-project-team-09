/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { type Catalogue, CATALOGUE_FILE, readCatalogue } from '../assistant/library/catalogue.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { CLOCK, systemClock } from '../quests/clock.js';
import { ROOM_CATALOGUE, RoomRequestSync } from './room-request-sync.service.js';

// What the Quests' and the Friends' modules call after a change, so that the room requests follow it. Imports no
// feature module, so that those can import it. Its clock is the Quests' one object, which a test moves for both.
@Module({
  imports: [NotificationsModule],
  providers: [
    { provide: ROOM_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    { provide: CLOCK, useValue: systemClock },
    RoomRequestSync,
  ],
  exports: [RoomRequestSync, ROOM_CATALOGUE],
})
export class RoomRequestSyncModule {}
