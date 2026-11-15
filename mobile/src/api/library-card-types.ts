/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// --- The library cards of a reply (main-server `assistant/library/library-card.ts`, the same shapes) ---

// A space of 관정도서관 as the server's catalogue gives it: a reading room's sector, booked by the seat, or a room
// sector (a group study room or a media room), booked by the room. `seatNos` are the sector's rooms, or an equipment
// group's when one was asked for. `mapImage` is the size of a reading room's seat map in image pixels. `hours` are
// "HH:MM" to "HH:MM" and the minutes are the booking's shortest, longest and step. `kind` is the catalogue's kind of
// space ('reading-room', 'notebook-zone', …), which a server before the seat card's room chip does not send.
export interface LibrarySpace {
  id: string;
  name: string;
  floor: number;
  kind?: string;
  placeNumber: string;
  unit: 'seat' | 'room';
  roomNo: number;
  sectorNo: number;
  seatNos: number[];
  mapImage: { width: number; height: number } | null;
  hours: { open: string; close: string };
  minMinutes: number;
  maxMinutes: number;
  stepMinutes: number;
}

export type LibraryAction = 'book' | 'cancel' | 'return' | 'seats' | 'myBookings';

// A library card of a reply, filled by the server from its catalogue and the tool's checked input. It carries no live
// data: the phone reads the seats, the rooms and the User's bookings from the library itself. `key` encodes the card,
// such as "book:7F-7A-zone2:2026-11-04:1700:60", and is its id in the history sent back. `date` is "YYYY-MM-DD" and
// `start` "HH:MM". `seat` is a seat's label or a room's name. `useDescOptions` are given when `useDesc` is not set,
// `pledge` is a media room's 서약서, and `notes` the site's rules for this kind. A cancel or a return card names the
// booking it looks for in `target`, and a space only when one was asked for. 내 예약 reads from `date` to `until`
// when the server sets both. Every field is sent, null when unset.
export interface LibraryCardData {
  key: string;
  action: LibraryAction;
  space: LibrarySpace | null;
  date: string | null;
  start: string | null;
  minutes: number | null;
  seat: string | null;
  useDesc: string | null;
  useDescOptions: string[];
  pledge: string | null;
  companions: { friendId: string; name: string }[];
  questId: string | null;
  notes: string[];
  until: string | null;
  target: { date?: string; spaceId?: string; start?: string } | null;
}

export interface LibraryCard {
  kind: 'library';
  library: LibraryCardData;
}
