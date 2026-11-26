/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A study Plan's part (P10): its building's study spaces alone, and the 관정 group study room with Friends.

export interface PlanStudy {
  // Alone: the building's study spaces that fit, best first. Empty with Friends.
  spaces: StudySpot[];
  // Alone, 관정관's catalogue space to book (7F-7A-zone2 for a quiet place); null elsewhere and with Friends.
  book: { spaceId: string } | null;
  // 관정관's free seats and rooms are read on the phone, through the User's own library login; null elsewhere.
  liveSeats: 'kwanjeong' | null;
  // Together (`StudyInput.together`) or with Friends: the 관정 group study room (P10, 2026-11-27). Absent alone.
  group?: StudyGroup;
}

export interface GroupRoomKind {
  // The catalogue's id, such as 4F-group-6.
  spaceId: string;
  floor: number;
  // "6인실"
  name: string;
  capacity: { min: number; max: number };
}

// The group study room of a study plan with Friends. The specific room (G412) is the phone's: it reads which rooms of
// the kind are free for the whole time, and takes the first by default.
export interface StudyGroup {
  // The kind picked: studyRoomFor's, or the one the User chose while it fits.
  room: GroupRoomKind;
  // Every kind, 2층 first, for the ticket's left cell; `reason` says why one does not fit ("6명부터", "6명까지").
  rooms: (GroupRoomKind & { fits: boolean; reason: string | null })[];
  people: number;
  // How many more people the smallest room needs, 3 for the asker alone; above 0 no request can be sent ("+ 같이").
  moreNeeded: number;
  // The book key "동의 요청 보내기" posts to POST /library/room-requests with the Friends ("book:4F-group-6:2026-11-28:
  // 1500:120", ending in ":wait" past the booking window); null while moreNeeded is above 0.
  key: string | null;
  // 사용 용도, the catalogue's options for the kind.
  useDescOptions: string[];
  // Past the booking window, when it opens ("11월 29일 09:00"); null within it.
  opens: string | null;
  // The request sent from this answer, when the answer is rebuilt from it; null before it is sent.
  request: RoomRequestState | null;
}

// A room request as the rebuilt answer shows it: "동의 1/3 · 박민수, 이서연 님을 기다려요", "모두 동의했어요", "예약됨".
export interface RoomRequestState {
  id: string;
  status: 'gathering' | 'ready' | 'booked' | 'cancelled' | 'dissolved' | 'expired';
  // Of the companions still in.
  consented: number;
  asked: number;
  // The names still to answer.
  waiting: string[];
  // As GET /library/room-requests/:id gives it.
  moreNeeded: number;
}

// A study space of a study Plan's building. `open` is never closed: a space closed then is in the answer's `closed`.
export interface StudySpot {
  key: string;
  name: string;
  kind: 'library' | 'reading' | 'lounge' | 'pc' | 'group';
  // The display text of its hours, null when the sources give none.
  hours: string | null;
  open: 'open' | 'unknown';
  // HH:MM, when known.
  closesAt: string | null;
}
