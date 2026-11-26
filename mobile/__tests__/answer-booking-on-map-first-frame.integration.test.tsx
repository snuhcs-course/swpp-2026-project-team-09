/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Place } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapLines, mapThings } from './support/answer-map';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// P01 ticket 07: the study answer on the map while its seats are still read, with a library that does not answer.
// From the first frame the map holds 관정관's label and the walk there, and the card says what it looks for; on the
// map the read gives up after 8 s with 다시 찾기. The phone's clock stands on Monday 2026-11-02 at 16:00 in Korea.

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

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
  library.holdSeats();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(): Promise<void> {
  await askForCards({ server, library }, [SEAT_CARD]);
  await layStage(390, 760);
  await pass(500);
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

describe('the study answer while its seats are read', () => {
  it('stands on the map from the first frame, with its label and the walk there', async () => {
    await asked();

    expect(mapThings()).toContain('관정 7층 열람실 · 17:00');
    expect(mapLines()).toHaveLength(1);
    // The ticket stands from the first frame, its seat filling in where it stands, with no sentence (P01 ticket 09).
    expect(card().queryByText(/찾고 있어요/u)).toBeNull();
    expect(within(card().getByTestId('seat-ticket')).getByText('7층 열람실')).toBeVisible();
    expect(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '예약하기' })).toBeDisabled();
  });

  it('says after 8 s that the seats did not come, with 다시 찾기', async () => {
    await asked();
    expect(card().queryByText('다시 찾기')).toBeNull();

    await pass(8_000);

    expect(card().getByText('관정 7층 열람실의 빈 자리를 받지 못했어요.')).toBeVisible();
    expect(card().getByRole('button', { name: '다시 찾기' })).toBeVisible();
    expect(card().queryByText(/찾고 있어요/u)).toBeNull();
  });
});
