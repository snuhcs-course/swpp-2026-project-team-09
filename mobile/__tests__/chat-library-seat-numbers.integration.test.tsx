/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, card, expectNoWrite, inCard, pressIn, startLibraryChat } from './support/library-chat';

// The seats card's seat numbers and its hint, against the fake main server and the fake library: the large view
// draws each seat's number and the small map none, and the hint tells the User a free seat books on a tap.

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

const HINT = '빈자리를 누르면 그 자리로 예약할 수 있어요';
// The numbers are drawn but are no accessible element of their own, so they are found among the hidden ones.
const HIDDEN = { includeHiddenElements: true };

let server: FakeServer;
let library: FakeLibrary;

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const SEATS_CARD = card(
  libraryCard('seats:7F-7A-zone2:2026-11-02', 'seats', { space: READING_ROOM, notes: SEAT_NOTES }),
);

async function laidOut(): Promise<void> {
  await fireEvent(screen.getByTestId('seat-map-room'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 0 } },
  });
  await pass(0);
}

describe('the seat numbers', () => {
  beforeEach(async () => {
    ({ server, library } = await startLibraryChat());
  });

  it('are drawn in the large view, not in the small map, centred and no smaller than 8', async () => {
    library.takeSeat(17202002);
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut();

    expect(screen.queryByText('7193', HIDDEN)).toBeNull();
    await pressIn(inCard(`library-seats-${SEATS_CARD.library.key}`), '좌석 현황 크게 보기');

    const large = screen.getByTestId('seat-map-large-map');
    expect(screen.getByText('7193', HIDDEN)).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByTestId('seat-number-7193', HIDDEN).props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 8 })]),
    );
    // A taken seat shows its number too, and the seat keeps its label without a second element for the number.
    expect(screen.getByText('7194', HIDDEN)).toBeTruthy();
    expect(within(large).getByLabelText('7194번 사용 중')).toBeTruthy();
    expect(screen.queryByText('7193')).toBeNull();
    expect(large).toBeVisible();
  });

  it('leave a tap on a free numbered seat giving its book card', async () => {
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut();
    await pressIn(inCard(`library-seats-${SEATS_CARD.library.key}`), '좌석 현황 크게 보기');

    expect(screen.getByText('7200', HIDDEN)).toBeTruthy();
    await pressIn(screen, '7200번 빈 자리');

    const given = inCard('library-book-book:7F-7A-zone2:2026-11-02:1600:120:s=7200');
    expect(given.getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the seat hint', () => {
  it('shows under the caption while seats can be booked', async () => {
    ({ server, library } = await startLibraryChat());
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut();

    expect(inCard(`library-seats-${SEATS_CARD.library.key}`).getByText(HINT)).toBeVisible();
  });

  it('is absent after closing time', async () => {
    ({ server, library } = await startLibraryChat(new Date('2026-11-02T14:10:00.000Z')));
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut();

    expect(screen.getByText('오늘은 예약 시간이 끝났어요')).toBeVisible();
    expect(screen.queryByText(HINT)).toBeNull();
  });
});
