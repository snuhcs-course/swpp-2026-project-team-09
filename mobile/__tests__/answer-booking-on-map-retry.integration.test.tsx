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
import { holdBackButton } from './support/back';
import { raiseCard } from './support/card-grip';
import { PLACES } from './support/dining';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, SEAT_CARD, startLibraryChat } from './support/library-chat';
import { layStage } from './support/lists';

// P01 ticket 04: the study answer on the map when the seats do not come (the read on the map gives up and offers
// 다시 찾기), Android's back over the open room list, and the walk on the label. The phone's clock stands on Monday
// 2026-11-02 at 16:00 in Korea; the card is for 7층 7A 열람실 2 구역 today from 17:00 for an hour.

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
const DOCKED = /^관정 7층 열람실에 17:00부터 1시간, 빈 자리 \d+석이에요\.$/u;

let server: FakeServer;
let library: FakeLibrary;
let back: () => Promise<boolean>;

beforeEach(async () => {
  back = holdBackButton();
  ({ server, library } = await startLibraryChat());
  server.on('GET /places', { status: 200, body: [...PLACES, KWANJEONG] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function asked(): Promise<Awaited<ReturnType<typeof askForCards>>> {
  const chat = await askForCards({ server, library }, [SEAT_CARD]);
  await layStage(390, 760);
  await pass(500);
  return chat;
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

describe('the seats that do not come', () => {
  it('says so in one line with 다시 찾기, which looks again', async () => {
    library.answerNext('network');
    const { user } = await asked();

    expect(card().getByText('관정 7층 열람실의 빈 자리를 받지 못했어요.')).toBeVisible();
    expect(card().queryByText(/찾고 있어요/u)).toBeNull();

    await user.press(card().getByRole('button', { name: '다시 찾기' }));
    await pass(500);

    expect(card().getByText(DOCKED)).toBeVisible();
  });
});

describe("Android's back over the room list", () => {
  it('closes the list first and keeps the answer', async () => {
    const { user } = await asked();
    await raiseCard();
    await pass(500);
    await user.press(card().getByRole('button', { name: '열람실: 7층 열람실' }));
    await pass(500);
    expect(screen.getByText('어느 열람실로 할까요?')).toBeVisible();

    expect(await back()).toBe(true);
    await pass(500);

    expect(screen.queryByText('어느 열람실로 할까요?')).toBeNull();
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

describe('the label on the map', () => {
  it('says the walk there', async () => {
    await asked();

    expect(mapThings()).toContainEqual(expect.stringMatching(/^관정 7층 열람실 › · \d+번 17:00–18:00 · 걸음 \d+분$/u));
  });
});
