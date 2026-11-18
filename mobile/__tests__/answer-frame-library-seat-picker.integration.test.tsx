/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';

// The seat book card's 자리 선택하기 and the room's seat picture (P15 ticket 57): every seat numbered, a press picks one
// seat and only that one changes colour, "<n>번 선택" puts it in the card, and 확대 and 축소 zoom it. Against the fake
// main server and the fake library.

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
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function seatCard(): ReturnType<typeof inCard> {
  return inCard(`library-book-${SEAT_CARD.library.key}`);
}

async function press(name: string): Promise<void> {
  await pressIn(seatCard(), name);
}

function image(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('seat-map-large-map-image');
}

describe('자리 선택하기 on the seat book card', () => {
  it('lets 자리 선택하기 pick a free seat on the seat picture, which only that seat shows, and choose it', async () => {
    library.takeSeat(17202002);
    await askForCards({ server, library }, [SEAT_CARD]);

    await press('자리 선택하기');
    const picture = within(screen.getByTestId('seat-map-large'));
    expect(picture.getByText('관정관 7층 7A 열람실 2 구역 좌석 현황')).toBeVisible();
    expect(screen.getByText('7300', { includeHiddenElements: true })).toBeTruthy();
    expect(picture.queryByRole('button', { name: /번 선택$/u })).toBeNull();
    // A taken seat is no button.
    expect(picture.queryByRole('button', { name: '7194번 빈 자리' })).toBeNull();

    await pressIn(picture, '7300번 빈 자리');
    expect(picture.getByRole('button', { name: '7300번 고른 자리' })).toHaveStyle({ backgroundColor: '#001A72' });
    expect(picture.getByRole('button', { name: '7200번 빈 자리' })).toHaveStyle({ backgroundColor: '#F89200' });
    expect(picture.getByRole('button', { name: '7300번 선택' })).toBeVisible();

    // A press on another seat moves the pick there.
    await pressIn(picture, '7200번 빈 자리');
    expect(picture.getByRole('button', { name: '7300번 빈 자리' })).toHaveStyle({ backgroundColor: '#F89200' });
    await pressIn(picture, '7200번 선택');

    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the seat picture, zoomed and closed', () => {
  it('zooms the seat picture with 확대 and 축소, between 1 and 4 times', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press('자리 선택하기');
    const picture = within(screen.getByTestId('seat-map-large'));
    expect(image()).toHaveStyle({ height: 300 });
    expect(picture.getByRole('button', { name: '축소' })).toBeDisabled();

    await pressIn(picture, '확대');
    expect(image()).toHaveStyle({ height: 450 });
    await pressIn(picture, '확대');
    await pressIn(picture, '확대');
    await pressIn(picture, '확대');
    expect(image()).toHaveStyle({ height: 1200 });
    expect(picture.getByRole('button', { name: '확대' })).toBeDisabled();
    await pressIn(picture, '축소');
    expect(image()).toHaveStyle({ height: 900 });
  });

  it('closes the seat picture on ✕ with the seat as it was', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press('자리 선택하기');
    const picture = within(screen.getByTestId('seat-map-large'));
    await pressIn(picture, '7300번 빈 자리');
    await pressIn(picture, '닫기');

    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();
  });
});
