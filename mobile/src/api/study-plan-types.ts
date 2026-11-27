/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { PlanPerson } from './assistant-types';
import type { RoomRequestStatus } from './room-requests';

// A study answer's conditions and its Plans' study part (P10), as main-server `assistant/dto/plan-input.dto.ts` and
// `study-plan.dto.ts` fix them.

// Where the asker can study that day: alone, the places that fit `what`; together, or with Friends, a 관정 group study
// room at everyone's free time.
export interface StudyInput {
  kind: 'study';
  // YYYY-MM-DD in Korea.
  date: string;
  what: 'quiet' | 'group' | 'pc' | 'any';
  // The asker first, then the Friends added.
  people: PlanPerson[];
  // The group study room answer, even before any Friend is added; with Friends it is that answer whatever this says.
  together: boolean;
  window: { from: string | null; until: string | null };
  area: { south: number; west: number; north: number; east: number } | null;
  // With Friends, the length asked; null for from–until.
  minutes: number | null;
  // What the User chose on the answer, kept across adding and removing Friends.
  chosen: { seatSpaceId: string | null; roomSpaceId: string | null };
}

export interface GroupRoomKind {
  // The catalogue's id, such as 4F-group-6.
  spaceId: string;
  floor: number;
  // "6인실"
  name: string;
  capacity: { min: number; max: number };
}

// The request sent from a group answer, as the answer rebuilt from it shows it.
export interface RoomRequestState {
  id: string;
  status: RoomRequestStatus;
  // Of the companions still in.
  consented: number;
  asked: number;
  // The names still to answer.
  waiting: string[];
  moreNeeded: number;
}

// The 관정 group study room of a study Plan with Friends. The room itself (G412) is the phone's to read.
export interface StudyGroup {
  room: GroupRoomKind;
  // Every kind, 2층 first; `reason` says why one does not fit ("6명부터", "10명까지").
  rooms: (GroupRoomKind & { fits: boolean; reason: string | null })[];
  people: number;
  // How many more people the smallest room needs; above 0 no request can be sent.
  moreNeeded: number;
  // The book key "동의 요청 보내기" posts with the Friends, ending in ":wait" past the booking window; null while people
  // are missing.
  key: string | null;
  // 사용 용도: the catalogue's options for the kind.
  useDescOptions: string[];
  // Past the booking window, when it opens, as words ("11월 29일 09:00"); null within it.
  opens: string | null;
  request: RoomRequestState | null;
}

export interface StudySpot {
  key: string;
  name: string;
  kind: 'library' | 'reading' | 'lounge' | 'pc' | 'group';
  hours: string | null;
  open: 'open' | 'unknown';
  closesAt: string | null;
}

export interface PlanStudy {
  // Alone, the building's study spaces, best first; empty with Friends.
  spaces: StudySpot[];
  book: { spaceId: string } | null;
  liveSeats: 'kwanjeong' | null;
  // Together or with Friends; absent alone.
  group?: StudyGroup;
}
