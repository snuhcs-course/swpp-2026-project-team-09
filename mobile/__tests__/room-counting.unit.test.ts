/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import { READING_ROOM } from '@/api/mock/data/library';
import type { Slot } from '@/library/cards/payloads';
import { freeSeatCount, freeSeats } from '@/library/cards/seats';
import type { LibrarySeat } from '@/library/replies';
import {
  type CountingDeps,
  forgetKeptCounts,
  KEEP_MS,
  RoomCounting,
  type Rooms,
} from '@/screens/main/library/room-counting';

// The seat card's room counts (P01 ticket 08), with the library's seat lists held until a test lets them come.
// Partitions: a count that arrives while the round is current, after 그대로 ended it, and after a newer read; the
// list read again within a minute, after it, and while a read of the same sector is on its way; a refresh that fails.
// Expected values: the counts drawn, and how many seat lists were asked.

const SLOT: Slot = { date: '2026-11-02', start: '17:00', minutes: 180 };
const SECTORS: LibrarySpace[] = [
  { ...READING_ROOM, id: 'a', sectorNo: 17202 },
  { ...READING_ROOM, id: 'b', sectorNo: 17201 },
];

function seat(no: number, free: boolean): LibrarySeat {
  return {
    SEATNO: no,
    NAME: String(no),
    VNAME: String(no),
    SECTORNO: 17202,
    STATUS: free ? 1 : 2,
    USECNT: free ? 0 : 1,
    POSX: 0,
    POSY: 0,
    POSW: 0,
    POSH: 0,
    GR_MIN: 0,
    GR_MAX: 0,
  };
}

// `free` free seats and one taken.
const seats = (free: number): LibrarySeat[] => [
  ...Array.from({ length: free }, (_, index) => seat(index + 1, true)),
  seat(free + 1, false),
];

interface Held {
  sector: string;
  come: (free: number) => void;
  fail: () => void;
}

let held: Held[];
let clock: number;

function depsOf(): CountingDeps {
  return {
    slot: () => SLOT,
    loggedIn: () => true,
    sectors: () => Promise.resolve(SECTORS),
    count: (sector) =>
      new Promise((resolve, reject) => {
        held.push({
          sector: sector.id,
          come: (free) => {
            resolve(freeSeatCount(seats(free)));
          },
          fail: () => {
            reject(new Error('network'));
          },
        });
      }),
    now: () => clock,
  };
}

const settle = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

function countsOf(rooms: Rooms): Record<string, unknown> {
  return rooms.state === 'listed' && rooms.counts !== null ? Object.fromEntries(rooms.counts) : {};
}

async function counted(counting: RoomCounting, free: Record<string, number>): Promise<void> {
  const reading = counting.read();
  await settle();
  for (const one of held.splice(0)) {
    one.come(free[one.sector] ?? 0);
  }
  await reading;
}

beforeEach(() => {
  forgetKeptCounts();
  held = [];
  clock = 0;
});

describe('A count that arrives', () => {
  it('tells those that listen as each count arrives', async () => {
    const counting = new RoomCounting(depsOf());
    const told: unknown[] = [];
    counting.subscribe(() => {
      told.push(countsOf(counting.get()));
    });

    await counted(counting, { a: 3, b: 5 });

    expect(countsOf(counting.get())).toEqual({ a: 3, b: 5 });
    expect(told.at(-1)).toEqual({ a: 3, b: 5 });
  });

  it('changes nothing on screen once 그대로 ended its round, and is kept for the next look', async () => {
    const counting = new RoomCounting(depsOf());
    const reading = counting.read();
    await settle();
    const before = counting.get();

    counting.stop();
    for (const one of held.splice(0)) {
      one.come(4);
    }
    await reading;

    expect(counting.get()).toBe(before);
    void counting.read();
    await settle();
    expect(countsOf(counting.get())).toEqual({ a: 4, b: 4 });
    expect(held).toEqual([]);
  });
});

describe('The rooms read again', () => {
  it('within a minute shows the kept counts at once and asks nothing', async () => {
    const counting = new RoomCounting(depsOf());
    await counted(counting, { a: 3, b: 5 });
    clock += KEEP_MS - 1;

    void counting.read();
    await settle();

    expect(countsOf(counting.get())).toEqual({ a: 3, b: 5 });
    expect(held).toEqual([]);
  });

  it('after a minute shows the kept counts while it asks again, and keeps them when the asking fails', async () => {
    const counting = new RoomCounting(depsOf());
    await counted(counting, { a: 3, b: 5 });
    clock += KEEP_MS;

    const reading = counting.read();
    await settle();

    expect(countsOf(counting.get())).toEqual({ a: 3, b: 5 });
    expect(held.map(({ sector }) => sector)).toEqual(['a', 'b']);
    held[0]?.come(9);
    held[1]?.fail();
    await reading;
    expect(countsOf(counting.get())).toEqual({ a: 9, b: 5 });
  });

  it('while a read of the same sector and time is on its way shares it', async () => {
    const one = new RoomCounting(depsOf());
    const other = new RoomCounting(depsOf());

    void one.read();
    void other.read();
    await settle();

    expect(held.map(({ sector }) => sector)).toEqual(['a', 'b']);
  });
});

describe("A room's count", () => {
  it('is the free seats, with no order needed', () => {
    const listed = [seat(10, true), seat(2, false), seat(3, true)];

    expect(freeSeatCount(listed)).toBe(freeSeats(listed).length);
    expect(freeSeats(listed).map(({ VNAME }) => VNAME)).toEqual(['3', '10']);
  });
});
