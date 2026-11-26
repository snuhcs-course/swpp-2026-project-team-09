/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';

// 관정관's seat spaces as the seat card's room chip and its list show them. A room is a kind of seat space on a floor
// ("7층 노트북존"), which may hold several seat spaces; each seat space has a short name ("7A 노트북존"). A cell of the
// list stands for the one seat space of its room a tap would fill: the one with the most free seats for the card's
// time, or without counts the largest.

export interface Room {
  floor: number;
  kind: string;
  // The chip's words ("7층 노트북존") and the cell's, which its floor column already gives ("노트북존").
  label: string;
  cell: string;
}

const ROOMS: readonly Room[] = [
  { floor: 7, kind: 'reading-room', label: '7층 열람실', cell: '열람실' },
  { floor: 8, kind: 'reading-room', label: '8층 정숙 열람실', cell: '정숙 열람실' },
  { floor: 7, kind: 'notebook-zone', label: '7층 노트북존', cell: '노트북존' },
  { floor: 8, kind: 'notebook-zone', label: '8층 노트북존', cell: '노트북존' },
  { floor: 8, kind: 'grad-reading-room', label: '대학원 열람실', cell: '대학원 열람실' },
];

// The list's rows, top to bottom.
const KIND_ORDER = ['reading-room', 'notebook-zone', 'grad-reading-room'];

// Each seat space's short name, and its seats in the catalogue, which say the largest of a room.
const SEAT_SPACES: Readonly<Record<string, { short: string; tag: string; seats: number }>> = {
  '7F-7A-zone2': { short: '7층 열람실', tag: '7층', seats: 478 },
  '7F-7A-zone1-notebook': { short: '7A 노트북존', tag: '7A', seats: 192 },
  '7F-notebook-171': { short: '171호 노트북존', tag: '171호', seats: 128 },
  '7F-7B-notebook': { short: '7B 노트북존', tag: '7B', seats: 194 },
  '8F-8A-zone1-quiet': { short: '8층 정숙 열람실', tag: '8층', seats: 168 },
  '8F-8A-zone2-notebook': { short: '8A 노트북존', tag: '8A', seats: 560 },
  '8F-notebook-181': { short: '181호 노트북존', tag: '181호', seats: 128 },
  '8F-grad-reading-room': { short: '대학원 열람실', tag: '대학원', seats: 194 },
};

// A seat space's free seats for the card's time: counted, still being read, or not read.
export type RoomCount = number | 'pending' | 'failed';

// The counts by seat space id; null without a library session, when nothing is read.
export type RoomCounts = ReadonlyMap<string, RoomCount> | null;

// The room of a seat space the chip can name; null for any other space, or one from a server that sends no kind.
export function roomOf(space: Pick<LibrarySpace, 'id' | 'floor' | 'kind'>): Room | null {
  if (SEAT_SPACES[space.id] === undefined) {
    return null;
  }
  return ROOMS.find(({ floor, kind }) => floor === space.floor && kind === space.kind) ?? null;
}

// "관정 7층 열람실": the room's chip words, or its floor and short name; the room's one name on the map and in the done
// message (P01 ticket 03).
export function roomTitle(space: Pick<LibrarySpace, 'id' | 'floor' | 'kind' | 'name'>): string {
  return `관정 ${roomOf(space)?.label ?? `${String(space.floor)}층 ${shortName(space)}`}`;
}

// "7A 노트북존", or the space's own name for one the phone has no short name for.
export function shortName(space: Pick<LibrarySpace, 'id' | 'name'>): string {
  return SEAT_SPACES[space.id]?.short ?? space.name;
}

function seatsOf(space: LibrarySpace): number {
  return SEAT_SPACES[space.id]?.seats ?? 0;
}

function sameRoom(one: Room, other: Room): boolean {
  return one.floor === other.floor && one.kind === other.kind;
}

// The seat spaces of a room among the sectors, in their order.
export function spacesOf(room: Room, sectors: readonly LibrarySpace[]): LibrarySpace[] {
  return sectors.filter((sector) => {
    const its = roomOf(sector);
    return its !== null && sameRoom(its, room);
  });
}

export interface RoomRow {
  // One cell per floor, null where that floor has no room of the row's kind.
  cells: (Room | null)[];
}

// The list: one column per floor, one row per kind of room, from the sectors the User may book.
export function roomGrid(sectors: readonly LibrarySpace[]): { floors: number[]; rows: RoomRow[] } {
  const rooms = ROOMS.filter((room) => spacesOf(room, sectors).length > 0);
  const floors = [...new Set(rooms.map(({ floor }) => floor))].toSorted((one, other) => one - other);
  const rows = KIND_ORDER.flatMap((kind): RoomRow[] => {
    const cells = floors.map((floor) => rooms.find((room) => room.floor === floor && room.kind === kind) ?? null);
    return cells.some((cell) => cell !== null) ? [{ cells }] : [];
  });
  return { floors, rows };
}

function largest(spaces: readonly LibrarySpace[]): LibrarySpace | null {
  return spaces.reduce<LibrarySpace | null>(
    (best, space) => (best === null || seatsOf(space) > seatsOf(best) ? space : best),
    null,
  );
}

interface Counted {
  space: LibrarySpace;
  free: number;
}

function countedOf(spaces: readonly LibrarySpace[], counts: ReadonlyMap<string, RoomCount>): Counted[] {
  return spaces.flatMap((space) => {
    const count = counts.get(space.id);
    return typeof count === 'number' ? [{ space, free: count }] : [];
  });
}

// The most free seats, the first in order on a tie.
function most(counted: readonly Counted[]): Counted | null {
  return counted.reduce<Counted | null>((best, each) => (best === null || each.free > best.free ? each : best), null);
}

// What a cell shows at its right: nothing without a session, "…" while a read is pending, "—" when a read failed, the
// free seats, or 만석.
export type CellCount =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'failed' }
  | { kind: 'free'; free: number }
  | {
      kind: 'full';
    };

export interface Cell {
  count: CellCount;
  // The seat space a tap fills; null for a full room, which cannot be tapped.
  pick: LibrarySpace | null;
}

// A cell of the list: the free seats of the one seat space of its room with the most of them, never a sum. Until they
// are known, a tap fills the largest.
export function cellOf(spaces: readonly LibrarySpace[], counts: RoomCounts): Cell {
  if (counts === null) {
    return { count: { kind: 'none' }, pick: largest(spaces) };
  }
  const best = most(countedOf(spaces, counts));
  if (spaces.some((space) => (counts.get(space.id) ?? 'pending') === 'pending')) {
    return { count: { kind: 'pending' }, pick: best !== null && best.free > 0 ? best.space : largest(spaces) };
  }
  if (best !== null && best.free > 0) {
    return { count: { kind: 'free', free: best.free }, pick: best.space };
  }
  const failed = spaces.filter((space) => counts.get(space.id) === 'failed');
  return failed.length === 0
    ? { count: { kind: 'full' }, pick: null }
    : { count: { kind: 'failed' }, pick: largest(failed) };
}

// The seat space a full one is swapped for: of the same kind, on any floor, the one with the most free seats, else the
// one with the most free seats of all; null when every one is full or unknown.
export function swapFor(full: LibrarySpace, sectors: readonly LibrarySpace[], counts: RoomCounts): LibrarySpace | null {
  if (counts === null) {
    return null;
  }
  const open = countedOf(
    sectors.filter((sector) => sector.id !== full.id && roomOf(sector) !== null),
    counts,
  ).filter(({ free }) => free > 0);
  return (most(open.filter(({ space }) => space.kind === full.kind)) ?? most(open))?.space ?? null;
}

// Why the phone filled this seat space of its room, when the room holds several and this one has the most free
// seats: "7층 노트북존 가운데 빈 자리가 가장 많은 곳이에요" over "7A 31석 · 7B 25석 · 171호 12석".
export function basisOf(
  space: LibrarySpace,
  sectors: readonly LibrarySpace[],
  counts: RoomCounts,
): { why: string; counts: string } | null {
  const room = roomOf(space);
  if (room === null || counts === null) {
    return null;
  }
  const spaces = spacesOf(room, sectors);
  const counted = countedOf(spaces, counts).toSorted((one, other) => other.free - one.free);
  if (spaces.length < 2 || counted.length < spaces.length || counted[0]?.space.id !== space.id) {
    return null;
  }
  return {
    why: `${room.label} 가운데 빈 자리가 가장 많은 곳이에요`,
    counts: counted
      .map(({ space: each, free }) => `${SEAT_SPACES[each.id]?.tag ?? each.name} ${String(free)}석`)
      .join(' · '),
  };
}
