/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibrarySpace } from '@/api/assistant-types';
import { GROUP_ROOM } from '@/api/mock/data/library';
import type { LibraryRoomTimes } from '@/library/replies';
import { forgetKeptCounts, KEEP_MS } from '@/screens/main/library/room-counting';
import { roomKindCounting } from '@/screens/main/library/room-kind-counts';
import roomList from './support/kwanjeong/getRoomList_14103_20261102.json';

// The free rooms of each kind of group study room for the answer's time (P10 ticket 10): counted as the seat card's
// rooms are, read when the room chooser opens, kept for a minute.

const ROOMS: LibraryRoomTimes[] = roomList.BookingTimeList;
const SLOT = { date: '2026-11-02', start: '15:00', minutes: 60 };

// Two kinds in the same sector, told apart by their rooms: the first nine rooms, and the rest.
const SIX: LibrarySpace = {
  ...GROUP_ROOM,
  id: '4F-group-6',
  seatNos: ROOMS.slice(0, 9).map(({ SEATNO }) => Number(SEATNO)),
};
const EIGHT: LibrarySpace = {
  ...GROUP_ROOM,
  id: '4F-group-8',
  seatNos: ROOMS.slice(9).map(({ SEATNO }) => Number(SEATNO)),
};

const freeAt = (rooms: readonly LibraryRoomTimes[]): number =>
  rooms.filter(
    ({ ABLETIME }) => ABLETIME.includes(`${SLOT.date} 15:00:00`) && ABLETIME.includes(`${SLOT.date} 15:30:00`),
  ).length;

let clock = 0;
let reads: string[] = [];

function counting(loggedIn = true): ReturnType<typeof roomKindCounting> {
  return roomKindCounting({
    spaces: [SIX, EIGHT],
    slot: () => SLOT,
    loggedIn: () => loggedIn,
    roomTimes: (space) => {
      reads.push(space.id);
      return Promise.resolve(ROOMS);
    },
    now: () => clock,
  });
}

beforeEach(() => {
  forgetKeptCounts();
  clock = 0;
  reads = [];
});

// Partitions: a first read, a read within the minute, one after it, and no library session. Expected values: the
// library's room list of 2026-11-02, P01 ticket 08's minute.
describe('The free rooms of the room kinds', () => {
  it('counts each kind’s free rooms for the time, by its own rooms', async () => {
    const rooms = await counting().read();

    expect(rooms.state === 'listed' ? Object.fromEntries(rooms.counts ?? []) : null).toEqual({
      '4F-group-6': freeAt(ROOMS.slice(0, 9)),
      '4F-group-8': freeAt(ROOMS.slice(9)),
    });
  });

  it('reads nothing again within a minute, and reads again after it', async () => {
    await counting().read();
    clock = KEEP_MS - 1;
    await counting().read();
    expect(reads).toEqual(['4F-group-6', '4F-group-8']);

    clock = KEEP_MS;
    await counting().read();
    expect(reads).toEqual(['4F-group-6', '4F-group-8', '4F-group-6', '4F-group-8']);
  });

  it('reads nothing without a library session', async () => {
    const rooms = await counting(false).read();

    expect(rooms).toMatchObject({ state: 'listed', counts: null });
    expect(reads).toEqual([]);
  });
});
