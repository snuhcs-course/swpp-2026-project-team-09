/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import type { Slot } from '@/library/cards/payloads';
import type { RoomCount, RoomCounts } from '@/library/cards/seat-rooms';
import { freeSeatCount } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import { SEATS_WAIT_MS, withinWait } from './seats-wait';

// The free seats of the seat card's rooms (P01 tickets 03 and 08), held apart from the card, so that each count that
// arrives draws the room list alone and not the card, the sheet and the map under it. A count is kept for a minute: the
// list opened again, or a time gone back to, shows it at once and reads nothing; an older one shows while it is read
// again. One sector's seats for one time are read once at a time, whoever asks.

// The seat card's rooms: the seat sectors the 공부공간 layer gives for 관정관, already cut by 소속 on the server, and
// their free seats for the card's time. Nothing is read before `read`.
export type Rooms =
  | { state: 'idle' | 'listing' | 'unlisted' }
  | { state: 'listed'; sectors: readonly LibrarySpace[]; counts: RoomCounts };

// How long a count is shown without reading it again.
export const KEEP_MS = 60_000;

interface Kept {
  count: number;
  at: number;
}

const kept = new Map<string, Kept>();
const reading = new Map<string, Promise<number>>();

const keyOf = (sector: LibrarySpace, slot: Slot): string =>
  `${sector.id} ${slot.date} ${slot.start} ${String(slot.minutes)}`;

// For tests, which start each from nothing kept.
export function forgetKeptCounts(): void {
  kept.clear();
  reading.clear();
}

// What the counting asks of the app: the card's time, the library session, the sectors, a sector's seats, and the clock.
export interface CountingDeps {
  slot: () => Slot;
  loggedIn: () => boolean;
  sectors: () => Promise<LibrarySpace[] | null>;
  seats: (sector: LibrarySpace, slot: Slot) => Promise<LibrarySeat[]>;
  now: () => number;
}

// One sector's free seats for the time, kept when they come; a read already on its way is shared.
function countFor(sector: LibrarySpace, slot: Slot, deps: CountingDeps): Promise<number> {
  const key = keyOf(sector, slot);
  const shared = reading.get(key);
  if (shared !== undefined) {
    return shared;
  }
  const count = deps
    .seats(sector, slot)
    .then((seats) => {
      const free = freeSeatCount(seats);
      kept.set(key, { count: free, at: deps.now() });
      return free;
    })
    .finally(() => {
      reading.delete(key);
    });
  reading.set(key, count);
  return count;
}

export class RoomCounting {
  private rooms: Rooms = { state: 'idle' };
  private readonly listeners = new Set<() => void>();
  private round = 0;

  constructor(private readonly deps: CountingDeps) {}

  readonly get = (): Rooms => this.rooms;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // Ends the round on its way: what it still reads is kept for the next look, and changes nothing on screen.
  readonly stop = (): void => {
    this.round += 1;
  };

  // Lists the sectors and reads each one's seats for the card's time at once, those kept for less than a minute
  // excepted; a read that fails leaves the others, and keeps an older count when there is one. Without a library
  // session it lists the sectors and reads nothing. The newest read wins.
  readonly read = async (): Promise<Rooms> => {
    this.round += 1;
    const mine = this.round;
    const live = (): boolean => mine === this.round;
    const slot = this.deps.slot();
    if (this.rooms.state !== 'listed') {
      this.show(live, { state: 'listing' });
    }
    const sectors = await this.deps.sectors();
    if (sectors === null) {
      return this.show(live, { state: 'unlisted' });
    }
    if (!this.deps.loggedIn()) {
      return this.show(live, { state: 'listed', sectors, counts: null });
    }
    const asked = this.deps.now();
    const keptOf = (sector: LibrarySpace): Kept | undefined => kept.get(keyOf(sector, slot));
    const counts = new Map(
      sectors.map((sector): [string, RoomCount] => [sector.id, keptOf(sector)?.count ?? 'pending']),
    );
    this.show(live, { state: 'listed', sectors, counts: new Map(counts) });
    const due = sectors.filter((sector) => {
      const one = keptOf(sector);
      return one === undefined || asked - one.at >= KEEP_MS;
    });
    const tell = (id: string, count: RoomCount): void => {
      counts.set(id, count);
      const { rooms } = this;
      if (live() && rooms.state === 'listed' && rooms.counts !== null) {
        this.show(live, { ...rooms, counts: new Map(rooms.counts).set(id, count) });
      }
    };
    await Promise.allSettled(
      due.map((sector) =>
        withinWait(countFor(sector, slot, this.deps), SEATS_WAIT_MS).then(
          (count) => {
            tell(sector.id, count);
          },
          () => {
            tell(sector.id, keptOf(sector)?.count ?? 'failed');
          },
        ),
      ),
    );
    return this.show(live, { state: 'listed', sectors, counts });
  };

  private show(live: () => boolean, next: Rooms): Rooms {
    if (live()) {
      this.rooms = next;
      for (const listener of this.listeners) {
        listener();
      }
    }
    return next;
  }
}
