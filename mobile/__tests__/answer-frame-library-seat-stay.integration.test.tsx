/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  expectNothingOfTheLibrarySent,
  expectNoWrite,
  inCard,
  inFrame,
  pressIn,
  SEAT_CARD,
  startLibraryChat,
} from './support/library-chat';

// A seat booked on the library's site becomes a Quest the User holds alone (P05-14): after 예약하기 the phone tells the
// main server the space and the time, never the seat or the booking number, and a failure there leaves the booking
// and its done message as they are. Against the fake main server and the fake library.

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

const SEAT_TEST_ID = `library-book-${SEAT_CARD.library.key}`;
const STAY = 'POST /library/seat-stays';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: before 예약하기, and after it with the main server failing. Expected values: the seat card's space and
// slot (7A 열람실 2 구역, today 17:00 for an hour).
describe('the stay of a seat booked', () => {
  it('is told to the main server after 예약하기 only, by its space and time, with a key', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expectNoWrite(library);
    expect(server.received(STAY)).toEqual([]);

    await pressIn(inCard(SEAT_TEST_ID), '예약하기');
    await pass(500);

    const sent = server.received(STAY);
    expect(sent.map(({ body }) => body)).toEqual([
      { spaceId: '7F-7A-zone2', date: '2026-11-02', start: '17:00', minutes: 60 },
    ]);
    expect(sent[0]?.idempotencyKey).toMatch(/^[\da-f-]{36}$/u);
    expectNothingOfTheLibrarySent(server, ['7193', '2000001']);
  });

  it('leaves the booking and its done message as they are when the main server fails', async () => {
    server.on(STAY, { status: 500, body: { statusCode: 500 } });
    await askForCards({ server, library }, [SEAT_CARD]);

    await pressIn(inCard(SEAT_TEST_ID), '예약하기');
    await pass(500);

    expect(library.writes()).toHaveLength(1);
    expect(inFrame().getByText('7193번 예약되었어요!')).toBeVisible();
  });
});
