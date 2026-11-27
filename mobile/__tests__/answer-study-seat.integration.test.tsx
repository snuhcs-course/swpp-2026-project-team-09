/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_PLAN_REPLY } from '@/api/mock/data/study-plan-answer';
import { markLibraryLoggedIn } from '@/library/flag';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { expectNoWrite, inFrame, sendFromBar, startLibraryChat } from './support/library-chat';
import { openMain } from './support/main';

// 관정관 opened from a study answer alone (P10 ticket 22): its view is today's seat ticket, the book card the main
// server sends with the Plan (its ticket 21), with its seat and 예약하기, in the place of its spaces. Nothing is written
// to the library before 예약하기.

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

// The stored study answer's day and time: Wednesday 2026-11-04 at 19:10.
const ASKED = new Date('2026-11-04T10:10:00.000Z');
const KEY = 'book:7F-7A-zone2:2026-11-04:1930:210';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat(ASKED));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function opened(row: number): Promise<void> {
  await markLibraryLoggedIn();
  server.on('POST /assistant/messages', { status: 200, body: STUDY_PLAN_REPLY });
  const user = await openMain();
  await sendFromBar(user, '공부할 자리 있어?');
  await user.press(inFrame().getByTestId(`meal-row-${String(row)}`));
  await pass(500);
}

// Partitions: 관정관; another place. Expected values: the stored answer and its book card.
describe('a study place opened from the list', () => {
  it('is today’s seat ticket for 관정관, with 예약하기, writing nothing', async () => {
    await opened(2);
    const seat = within(inFrame().getByTestId(`library-book-${KEY}`));

    expect(seat.getByRole('button', { name: '예약하기' })).toBeVisible();
    expect(inFrame().queryByTestId('study-spaces')).toBeNull();
    expectNoWrite(library);
  });

  it('is its spaces and hours for another place', async () => {
    await opened(1);

    expect(inFrame().getByTestId('study-spaces')).toBeVisible();
    expect(inFrame().queryByTestId(`library-book-${KEY}`)).toBeNull();
  });
});
