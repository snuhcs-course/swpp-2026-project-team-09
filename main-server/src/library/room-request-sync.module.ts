/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { type Catalogue, CATALOGUE_FILE, readCatalogue } from '../assistant/library/catalogue.js';
import { ROOM_CATALOGUE, RoomRequestSync } from './room-request-sync.service.js';

// What the Quests' and the Friends' modules call after a change, so that the room requests follow it. Imports no
// feature module, so that those can import it.
@Module({
  providers: [
    { provide: ROOM_CATALOGUE, useFactory: (): Promise<Catalogue> => readCatalogue(CATALOGUE_FILE) },
    RoomRequestSync,
  ],
  exports: [RoomRequestSync, ROOM_CATALOGUE],
})
export class RoomRequestSyncModule {}
