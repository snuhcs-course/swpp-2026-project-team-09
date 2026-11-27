/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { LibraryCardData } from '@/api/assistant-types';
import { READING_ROOM } from '@/api/mock/data/library';
import type { Slot } from '@/library/cards/payloads';
import { confirmedPress } from '@/library/client';
import { library } from '@/library/library';
import type { LibrarySeat } from '@/library/replies';
import { type Booking, readKeyOf, SEATS_STALE, sendBooking } from '@/screens/main/library/seat-booking';
import type { LibraryCardActions } from '@/screens/main/library/use-library-call';

// 예약하기 sends a seat only for the room and time it was read for (PR 500's review): after a change of room or time,
// until the new read lands, a press sends nothing; once it has landed, the seat is sent.

jest.mock('@/clock', () => ({
  now: (): Date => new Date('2026-11-02T07:00:00.000Z'),
  clockMoves: (): boolean => false,
}));
jest.mock('@/library/library', () => ({
  library: { book: jest.fn(), seats: jest.fn() },
}));

const noop = (): void => undefined;

const SLOT: Slot = { date: '2026-11-02', start: '17:00', minutes: 60 };
const QUIET = { ...READING_ROOM, id: '8F-8A-zone1-quiet', sectorNo: 18201 };
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only VNAME and SEATNO are read
const SEAT = { VNAME: '7193', SEATNO: 7193 } as unknown as LibrarySeat;
const PRESS = confirmedPress();

function booking(readFor: string | null, space = READING_ROOM, slot = SLOT): Booking {
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only its notes are read
    card: { notes: [] } as unknown as LibraryCardData,
    place: '1:book',
    space,
    slot,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only addOwn is called
    actions: { addOwn: jest.fn() } as unknown as LibraryCardActions,
    close: noop,
    choose: noop,
    reload: noop,
    hold: noop,
    readFor,
  };
}

const book = jest.mocked(library.book);

beforeEach(() => {
  book.mockReset();
  book.mockResolvedValue({ successYN: 'Y', bookingResultInfo: { BSEQNO: 2000001, SEATNO: 7193 } });
});

describe('a seat sent only for the room and time it was read for', () => {
  it('sends nothing after a change of room, before the new room is read', async () => {
    const failed = await sendBooking(booking(readKeyOf(READING_ROOM, SLOT), QUIET), SEAT, PRESS);

    expect(failed).toEqual({ failure: null, message: SEATS_STALE });
    expect(book).not.toHaveBeenCalled();
  });

  it('sends nothing after a change of time, before the new time is read', async () => {
    const later = { ...SLOT, start: '18:00' };
    const failed = await sendBooking(booking(readKeyOf(READING_ROOM, SLOT), READING_ROOM, later), SEAT, PRESS);

    expect(failed).toEqual({ failure: null, message: SEATS_STALE });
    expect(book).not.toHaveBeenCalled();
  });

  it('sends nothing while no read has landed', async () => {
    await sendBooking(booking(null), SEAT, PRESS);

    expect(book).not.toHaveBeenCalled();
  });

  it('sends the seat once the read for that room and time has landed', async () => {
    const failed = await sendBooking(booking(readKeyOf(READING_ROOM, SLOT)), SEAT, PRESS);

    expect(failed).toBeNull();
    expect(book).toHaveBeenCalledTimes(1);
  });
});
