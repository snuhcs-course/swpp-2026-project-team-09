/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LibrarySpace } from './assistant-types';
import type { Place } from './types';

// --- The 공부공간 layer (GET /study-spaces) ---

// One Study Space as the main server serves it to the User: whether the User may use it, and for a restricted one, to
// whom it is open ("경영대학", "대학원"); null for one open to all. `hours` is display text, or null when the sources
// do not give it.
export interface StudySpace {
  key: string;
  name: string;
  kind: 'library' | 'reading' | 'lounge' | 'pc' | 'group';
  hours: string | null;
  link: string | null;
  usable: boolean;
  restrictedTo: string | null;
}

// A building of the layer at its Place, `usable` when any of its spaces is. `liveSeats` lists 관정관's seat sectors
// the User may book, which the phone reads through the User's own Library Session; null for every other building.
export interface StudyBuilding {
  place: Place;
  name: string;
  usable: boolean;
  liveSeats: { sectors: LibrarySpace[] } | null;
  spaces: StudySpace[];
}
