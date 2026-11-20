/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { seatNumberSize } from '@/library/cards/seats';
import { pictureSize } from '@/library/cards/seat-zoom';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, pressIn, SEAT_CARD, startLibraryChat } from './support/library-chat';

// The seat book card's 자리 선택하기 and the room's seat picture (P15 ticket 57, P01 ticket 01 of Iteration 5): a press
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
// The picture's view, as the test lays it out, and the picture of 7A 열람실 2 구역 in image pixels.
const VIEW = { width: 320, height: 298 };
const IMAGE = { width: 2529, height: 1198 };

// The last offset the picture's scroll views were sent to on one axis.
function lastScroll(
  spy: jest.SpyInstance<void, Parameters<ScrollView['scrollTo']>>,
  axis: 'x' | 'y',
): number | undefined {
  const sent = spy.mock.calls.flatMap(([to]) => (typeof to === 'object' && to[axis] !== undefined ? [to[axis]] : []));
  return sent.at(-1);
}

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

describe('where the seat picture zooms', () => {
  it('zooms around the middle of the view, or around the picked seat, within the picture', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press('자리 선택하기');
    const picture = within(screen.getByTestId('seat-map-large'));
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await fireEvent(screen.getByTestId('seat-picker-scroll-down'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, ...VIEW } },
    });
    await fireEvent(screen.getByTestId('seat-map-scroll'), 'scroll', {
      nativeEvent: { contentOffset: { x: 100, y: 0 } },
    });

    // The view's middle, 260 × 149 of the picture at 1, is the middle at 1.5 too.
    await pressIn(picture, '확대');
    expect(lastScroll(scrollTo, 'x')).toBeCloseTo(260 * 1.5 - 160);
    expect(lastScroll(scrollTo, 'y')).toBeCloseTo(149 * 1.5 - 149);

    // Seat 7300's box is at 1468 × 237 of the 2529-pixel image, 33 × 28 pixels: at 2 its middle comes to the view's
    // middle, and the top edge holds the view at 0.
    await pressIn(picture, '7300번 빈 자리');
    await pressIn(picture, '확대');
    expect(lastScroll(scrollTo, 'x')).toBeCloseTo((1468 + 16.5) * (600 / 1198) - 160);
    expect(lastScroll(scrollTo, 'y')).toBe(0);
  });
});

describe('the seat numbers and the marked seat', () => {
  it('draws no cut number: none at 1, whole ones at 4, and the marked seat named at every zoom', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    await press('자리 선택하기');
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
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7300번')).toBeVisible();
  });
});
