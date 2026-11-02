/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { partyChangedWords } from '@/screens/main/library/book-room-card';
import { forgetPartyRequests } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { type FakeServer, refusal } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { bookingRow, inCard, pressIn, startLibraryChat } from './support/library-chat';
import { socketServer } from './support/live';
import { COMPANIONS, readyCard, REQUEST_ID } from './support/room-requests';

// A room booked through a room request stays booked whatever its report comes to: a report that does not get through
// is sent again later, and one the server refuses because the request ended says so, with the cancel card.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat());
  server.on(`GET /library/room-requests/${REQUEST_ID}/companions`, { status: 200, body: COMPANIONS });
  server.on('GET /library/room-requests', { status: 200, body: { asks: [], notices: [] } });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const RESULT = `POST /library/room-requests/${REQUEST_ID}/result`;

describe('the report of a room booked', () => {
  it('shows the booking done when the report fails, books once, and sends the report again when the requests are asked again', async () => {
    server.on(RESULT, 'no-answer');
    const shown = await readyCard({ server, library });

    await pressIn(shown, '예약하기');

    expect(library.writes().filter(({ endpoint }) => endpoint === 'setRoomBooking')).toHaveLength(1);
    expect(screen.getByText('G412 예약되었어요!')).toBeVisible();
    expect(screen.queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(server.received(RESULT)).toHaveLength(1);

    server.on(RESULT, { status: 204 });
    // The main screen asks its room requests again on the signal, and sends the kept report with it.
    await socketServer((socket) => {
      socket.accept();
      socket.send('room-requests-changed');
    });
    await pass(100);

    expect(server.received(RESULT).map(({ body }) => body)).toEqual([{ ok: true }, { ok: true }]);
    await socketServer((socket) => {
      socket.send('room-requests-changed');
    });
    await pass(100);
    expect(server.received(RESULT)).toHaveLength(2);
    expect(library.writes().filter(({ endpoint }) => endpoint === 'setRoomBooking')).toHaveLength(1);
  });

  it('says the room is booked but the party changed when the request ended, and offers its cancel', async () => {
    server.on(RESULT, refusal(409, 'ROOM_REQUEST_STATUS'));
    // The room as 내 예약 will list it once booked.
    library.addBooking(
      bookingRow({ BSEQNO: 2000001, SEATNO: 14103009, ROOMNO: 141, SECTORNO: 14103, SEAT_VNAME: 'G412' }),
    );
    const shown = await readyCard({ server, library });

    await pressIn(shown, '예약하기');

    expect(screen.getByText('G412 예약되었어요!')).toBeVisible();
    expect(screen.getByText(partyChangedWords('G412'))).toBeVisible();
    const cancel = inCard('library-cancel-cancel:4F-group-6:2026-11-02:1700');
    await pressIn(cancel, '취소하기');

    expect(library.writes().at(-1)).toEqual({ endpoint: 'setCancelBooking', body: { bseqno: '2000001' } });
    expect(library.writes().filter(({ endpoint }) => endpoint === 'setRoomBooking')).toHaveLength(1);
  });
});
