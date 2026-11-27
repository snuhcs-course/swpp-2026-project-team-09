/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inCard, pressIn, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { fakePostHog } from './support/posthog';
import { eventsOfAction, outsideRegistry, recorded } from './support/usage-actions';
import { openWithUsage } from './support/usage-app';
import { markLibraryLoggedIn } from '@/library/flag';

// A 관정도서관 seat booked, in the usage data over the fake main server and the library's stand-in, with the PostHog
// stand-in (P08 ticket 13): 예약하기 sends `seat_booking_requested` just before the booking goes to the library, then
// `seat_booking_completed` with the booking, or `seat_booking_failed` with `seat_taken`, `not_allowed`,
// `session_ended` or `network`. No event holds anything of the library but those fixed words, and the booking reaches
// the main server in none.

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

const ASKED = [
  ['assistant_reply_requested', {}],
  ['assistant_reply_completed', {}],
];

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  for (const client of fakePostHog().clients) {
    expect(outsideRegistry(recorded(client))).toEqual([]);
  }
  delete process.env.EXPO_PUBLIC_POSTHOG_TOKEN;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The seat card the Assistant answered with, signed in to the library, for a User who chose usage data.
async function askForSeat(): Promise<Awaited<ReturnType<typeof openWithUsage>>['client']> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '카드에서 확인해 주세요.', mapButtons: [], cards: [SEAT_CARD], proposal: null },
  });
  const { user, client } = await openWithUsage(server, null);
  await sendFromBar(user, '관정 7층 열람실 17시에 한 시간 예약해줘');
  return client;
}

async function book(): Promise<void> {
  await pressIn(inCard(`library-book-${SEAT_CARD.library.key}`), '예약하기');
}

it('sends seat_booking_requested, then seat_booking_completed with the booking', async () => {
  const client = await askForSeat();

  await book();

  expect(library.writes()).toHaveLength(1);
  expect(eventsOfAction(client)).toEqual([...ASKED, ['seat_booking_requested', {}], ['seat_booking_completed', {}]]);
});

it('sends seat_booking_failed with refused and seat_taken when the seat was just taken', async () => {
  const client = await askForSeat();
  library.takeSeat(17202001);

  await book();

  expect(eventsOfAction(client)).toEqual([
    ...ASKED,
    ['seat_booking_requested', {}],
    ['seat_booking_failed', { reason: 'refused', code: 'seat_taken' }],
  ]);
});

it('sends not_allowed when the library refuses for another reason, without its words', async () => {
  library.refuseBookings('예약 가능 시간이 아닙니다.');
  const client = await askForSeat();

  await book();

  expect(eventsOfAction(client)).toEqual([
    ...ASKED,
    ['seat_booking_requested', {}],
    ['seat_booking_failed', { reason: 'refused', code: 'not_allowed' }],
  ]);
});

it.each([
  ['network', { reason: 'network' }],
  ['sessionEnded', { reason: 'refused', code: 'session_ended' }],
] as const)('sends the failure of a booking that met %s', async (kind, failure) => {
  const client = await askForSeat();
  library.answerNext(kind);

  await book();

  expect(eventsOfAction(client)).toEqual([...ASKED, ['seat_booking_requested', {}], ['seat_booking_failed', failure]]);
});
