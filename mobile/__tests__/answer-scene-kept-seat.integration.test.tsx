/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, SEAT_CARD, sendFromBar, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// P04 ticket 46, from a hands-on pass on the study answer: a seat card on the map (7층 7A 열람실 2 구역 today from
// 17:00 for an hour), then a follow-up the Assistant answers with words alone, as a refusal or a question back. The
// card's flag, its bar, and 예약하기 stay; the card says the new words and the caption the new question.

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

const KWANJEONG: Place = {
  id: 'p62-1',
  number: '62-1',
  name: '중앙도서관 관정관',
  latitude: 37.45903,
  longitude: 126.95247,
};
// The flag's label with its walk since P01 ticket 04.
const FLAG = /^관정 7층 열람실 › · (\d+번 )?17:00–18:00( · 걸음 \d+분)?$/u;
const FOLLOW_UP = '내일도 같은 자리 돼?';
const REFUSED = '관정도서관 열람실은 당일만 예약할 수 있어요.';

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// Partitions: a seat card under a follow-up answered with words alone.
describe('a seat card under a follow-up', () => {
  it('keeps its flag, its bar, and 예약하기 when the reply is words alone', async () => {
    const { user } = await askForCards({ server, library }, [SEAT_CARD]);
    await layStage(390, 760);
    await pass(500);
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: REFUSED, mapButtons: [], cards: [], proposal: null },
    });

    await sendFromBar(user, FOLLOW_UP);

    expect(mapThings().some((thing) => FLAG.test(thing))).toBe(true);
    expect(within(screen.getByTestId('time-bar')).getByText('17:00–18:00 · 1시간')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
    expect(within(screen.getByTestId('answer-card')).getByText(REFUSED)).toBeVisible();
    expect(screen.getByTestId('answer-caption')).toHaveTextContent(FOLLOW_UP);
  });
});
