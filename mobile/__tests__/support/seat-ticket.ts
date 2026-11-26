/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type { LibrarySeat } from '@/library/replies';
import type { FakeServer } from './fake-server';
import type { FakeLibrary } from './kwanjeong/fake-library';
import { askForCards, card, inCard, type LibraryChat, startLibraryChat } from './library-chat';

// The seat card's ticket and the room list under it (P01 ticket 09) in the chat, against the fake main server and the
// fake library: the card the Assistant answers "공부할 자리" with, for 7층 7A 열람실 2 구역 today 17:00–20:00, and the free
// seats of each sector. The free seats are the design's example.

export const ROOM = '열람실: 7층 열람실';

export const FILLED = card(
  libraryCard('book:7F-7A-zone2:2026-11-02:1700:180', 'book', {
    space: READING_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 180,
    notes: SEAT_NOTES,
  }),
);

// The free seats of each sector for the card's time, by sectorNo, or a read that fails.
export type Free = Readonly<Record<number, number | 'fail'>>;

export const EXAMPLE: Free = {
  17202: 42,
  17201: 31,
  17101: 12,
  17301: 25,
  18201: 23,
  18202: 17,
  18101: 0,
};

export interface TicketWorld {
  server: FakeServer;
  library: FakeLibrary;
  // The key of the card the Assistant answered with.
  key: string;
}

export async function startTicketWorld(): Promise<TicketWorld> {
  const { server, library } = await startLibraryChat();
  server.on('GET /study-spaces', { status: 200, body: STUDY_BUILDINGS });
  return { server, library, key: FILLED.library.key };
}

function isSeatList(value: unknown): value is { SeatList: LibrarySeat[] } {
  return typeof value === 'object' && value !== null && 'SeatList' in value && Array.isArray(value.SeatList);
}

// The recorded seat lists with only the first `free` seats of each sector left free.
function freeSeats(library: FakeLibrary, free: Free): void {
  const recorded = library.answer.bind(library);
  jest.spyOn(library, 'answer').mockImplementation((endpoint, body) => {
    const reply = recorded(endpoint, body);
    const wanted = free[Number(body.sectorNo)];
    if (endpoint !== 'getSeatBookingList' || wanted === undefined || !reply.ok || !isSeatList(reply.result)) {
      return reply;
    }
    if (wanted === 'fail') {
      return { ok: false, error: 'network' };
    }
    let left = wanted;
    const seats = reply.result.SeatList.map((seat) => {
      if (seat.STATUS !== 1 || seat.USECNT !== 0) {
        return seat;
      }
      left -= 1;
      return left >= 0 ? seat : { ...seat, STATUS: 2, USECNT: 1 };
    });
    return { ok: true, result: { ...reply.result, SeatList: seats } };
  });
}

// The Assistant answers the words with the filled card, its seat named when `seat` is given.
export function askTicket(
  world: TicketWorld,
  given: { free?: Free; loggedIn?: boolean; words?: string; seat?: string } = {},
): Promise<LibraryChat> {
  freeSeats(world.library, given.free ?? EXAMPLE);
  const named =
    given.seat === undefined
      ? FILLED
      : card({ ...FILLED.library, key: `${FILLED.library.key}:s=${given.seat}`, seat: given.seat });
  world.key = named.library.key;
  return askForCards({ server: world.server, library: world.library }, [named], {
    loggedIn: given.loggedIn ?? true,
    words: given.words ?? '공부할 자리',
  });
}

export function seatCardOf(world: TicketWorld): ReturnType<typeof inCard> {
  return inCard(`library-book-${world.key}`);
}

export function ticketOf(world: TicketWorld): ReturnType<typeof within> {
  return within(seatCardOf(world).getByTestId('seat-ticket'));
}

// The sectors read, in order.
export function sectorsRead(library: FakeLibrary): string[] {
  return library.requestsTo('getSeatBookingList').map(({ body }) => body.sectorNo ?? '');
}

export function styleOf(element: { props: { style?: TextStyle } }): TextStyle {
  return StyleSheet.flatten(element.props.style) ?? {};
}
