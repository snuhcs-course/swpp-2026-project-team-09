/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { seatNumberSize } from '@/library/cards/seats';
import { pictureSize } from '@/library/cards/seat-zoom';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';

// The seat book card's seat on its ticket and the room's seat picture (P15 ticket 57, P01 tickets 01 and 09 of Iteration 5): a press
// picks one seat and only that one changes colour, "<n>번 선택" puts it in the card, 확대 and 축소 zoom it around the
// middle of the view or the picked seat, and a seat's number is drawn whole or not at all, while the marked seat's tag
// always names it. Against the fake main server and the fake library.

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

// The numbers and the tag are drawn but are no accessible element of their own: the seat's label names it.
const HIDDEN = { includeHiddenElements: true };
// The picture of 7A 열람실 2 구역 in image pixels.
const IMAGE = { width: 2529, height: 1198 };

async function zoomToMost(picture: ReturnType<typeof within>): Promise<void> {
  await pressIn(picture, '확대');
  await pressIn(picture, '확대');
  await pressIn(picture, '확대');
  await pressIn(picture, '확대');
}

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

// The seat on the card's ticket, which opens the seat picture (P01 ticket 09).
const TICKET_SEAT = /^좌석: \d+번$/u;

async function press(name: string | RegExp): Promise<void> {
  await pressIn(seatCard(), name);
}

describe("the seat on the seat book card's ticket", () => {
  it("lets the ticket's seat pick a free seat on the seat picture, which only that seat shows, and choose it", async () => {
    library.takeSeat(17202002);
    await askForCards({ server, library }, [SEAT_CARD]);

    await press(TICKET_SEAT);
    const picture = within(screen.getByTestId('seat-map-large'));
    expect(picture.getByText('관정 7층 열람실 좌석 현황')).toBeVisible();
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

    expect(seatCard().getByText('7200번')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the seat picture, zoomed and closed', () => {
  it('zooms the seat picture with 확대 and 축소, between 1 and 4 times', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press(TICKET_SEAT);
    // How far each step zooms and where the view lands is read from the picture's layer in its unit test
    // (`library-seat-pinch`): here, the buttons' ends (P01 ticket 11).
    const picture = within(screen.getByTestId('seat-map-large'));
    expect(picture.getByRole('button', { name: '축소' })).toBeDisabled();

    await pressIn(picture, '확대');
    expect(picture.getByRole('button', { name: '축소' })).toBeEnabled();
    await pressIn(picture, '확대');
    await pressIn(picture, '확대');
    await pressIn(picture, '확대');
    expect(picture.getByRole('button', { name: '확대' })).toBeDisabled();
    await pressIn(picture, '축소');
    expect(picture.getByRole('button', { name: '확대' })).toBeEnabled();
  });

  it('closes the seat picture on ✕ with the seat as it was', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press(TICKET_SEAT);
    const picture = within(screen.getByTestId('seat-map-large'));
    await pressIn(picture, '7300번 빈 자리');
    await pressIn(picture, '좌석 현황 닫기');

    expect(seatCard().getByText('7193번')).toBeVisible();
  });
});

// A pinch as react-native-gesture-handler reports it: each update's scale is the total since the fingers came down.
async function pinch(scales: readonly number[]): Promise<void> {
  await act(() => {
    fireGestureHandler(
      getByGestureTestId('seat-picker-pinch'),
      [1, ...scales].map((scale) => ({ scale, focalX: 160, focalY: 149 })),
    );
  });
}

describe('a pinch on the seat picture', () => {
  it('zooms by the total scale since the fingers came down, without compounding it, within 1 and 4 times', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press(TICKET_SEAT);

    // The zoom each pinch lands on is read from the picture's layer in its unit test (`library-seat-pinch`): here, that
    // the pinch zooms in and back out to 1, which the buttons' ends show.
    const picture = within(screen.getByTestId('seat-map-large'));
    await pinch([1.05, 1.1, 1.2, 1.3, 1.4, 1.5]);
    expect(picture.getByRole('button', { name: '축소' })).toBeEnabled();
    await pinch([1.4, 1.2]);
    expect(picture.getByRole('button', { name: '축소' })).toBeEnabled();
    await pinch([0.9, 0.5, 0.2]);
    expect(picture.getByRole('button', { name: '축소' })).toBeDisabled();
  });
});

describe('the seat numbers and the marked seat', () => {
  it('draws no cut number: none at 1, whole ones at 4, and the marked seat named at every zoom', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press(TICKET_SEAT);
    const picture = within(screen.getByTestId('seat-map-large'));

    expect(screen.queryByTestId('seat-number-7300', HIDDEN)).toBeNull();
    expect(screen.getByTestId('seat-tag', HIDDEN)).toHaveTextContent('7193');

    await zoomToMost(picture);
    // At 4 a seat's box is 33 × 28 pixels scaled to the picture's width: four digits of 0.7 and a point each side fit.
    const scale = pictureSize(IMAGE, 4).width / IMAGE.width;
    const size = seatNumberSize({ width: 33 * scale, height: 28 * scale }, '7300') ?? 0;
    expect(size).toBeGreaterThanOrEqual(8);
    expect(4 * 0.7 * size + 2).toBeLessThanOrEqual(33 * scale);
    const number = screen.getByTestId('seat-number-7300', HIDDEN);
    expect(number).toHaveTextContent('7300');
    expect(number).toHaveStyle({ fontSize: size });
    expect(number).toHaveProp('numberOfLines', 1);
    expect(number).toHaveProp('adjustsFontSizeToFit', true);

    // Once the numbers fit, the picked seat shows its own number and no tag covers the seat above it; zoomed out again,
    // the tag names the picked seat. Either names the seat the foot and then the card give.
    await pressIn(picture, '7300번 빈 자리');
    expect(screen.queryByTestId('seat-tag', HIDDEN)).toBeNull();
    expect(within(picture.getByRole('button', { name: '7300번 고른 자리' })).getByText('7300', HIDDEN)).toBeTruthy();
    await pressIn(picture, '축소');
    await pressIn(picture, '축소');
    expect(screen.getByTestId('seat-tag', HIDDEN)).toHaveTextContent('7300');
    await pressIn(picture, '7300번 선택');
    expect(seatCard().getByText('7300번')).toBeVisible();
  });
});
