/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type LibraryCardSpace } from '../../assistant/library/library-card.js';
import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type StudySpace } from '../study-spaces-file.js';

// One Study Space as GET /study-spaces serves it to a User: whether the User may use it, and for a restricted one, to
// whom it is open ("경영대학", "대학원"); null for one open to all.
export interface StudySpaceDto {
  key: string;
  name: string;
  kind: StudySpace['kind'];
  hours: string | null;
  link: string | null;
  usable: boolean;
  restrictedTo: string | null;
}

// A building of the 공부공간 layer at its Place. `usable` when any of its spaces is. `liveSeats` lists the seat
// sectors of 관정관 the User may book (8B for 대학원생 only), which the phone reads through the User's own Library
// Session; null for every other building. No count comes back to the server.
export interface StudyBuildingDto {
  place: PlaceDto;
  name: string;
  usable: boolean;
  liveSeats: { sectors: LibraryCardSpace[] } | null;
  spaces: StudySpaceDto[];
}
