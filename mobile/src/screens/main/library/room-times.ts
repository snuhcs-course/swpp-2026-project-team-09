/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import { siteDate } from '@/library/cards/times';
import { library } from '@/library/library';
import type { LibraryRoomTimes } from '@/library/replies';

// A room sector's rooms on a date, read as the site's own page reads them: getRoomList takes the sector's and the
// room's names as the site writes them, which getSectorList of the floor (floorno 10 + the floor) gives.
export async function roomTimesFor(space: LibrarySpace, date: string): Promise<LibraryRoomTimes[]> {
  const sectors = await library.sectors(10 + space.floor);
  const sector = sectors.find(({ SECTORNO }) => SECTORNO === space.sectorNo);
  return library.roomTimes({
    date: siteDate(date),
    roomNo: space.roomNo,
    sectorNo: space.sectorNo,
    sectorName: sector?.NAME ?? space.name,
    roomName: sector?.ROOM_NAME ?? space.name,
  });
}
