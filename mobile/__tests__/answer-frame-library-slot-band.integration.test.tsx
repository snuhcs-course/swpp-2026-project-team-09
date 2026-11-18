/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { READING_ROOM } from '@/api/mock/data/library';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, SEAT_CARD, startLibraryChat } from './support/library-chat';

// The seat book card's time as a band (P15 ticket 57): the card's time on the space's hours, moved by a screen
// reader's step of an end or of the band, and the seats read again for the new time. Against the fake main server and
// the fake library.

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

describe('the time band of the seat book card', () => {
  it("shows the card's time on the space's hours, and a step of its end reads the seats for the new time", async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    const band = within(seatCard().getByTestId('slot-band'));
    expect(band.getByText('17:00–18:00 · 1시간')).toBeVisible();
    expect(band.getByText(READING_ROOM.hours.open)).toBeVisible();
    expect(band.getByText(READING_ROOM.hours.close)).toBeVisible();
    const before = library.requestsTo('getSeatBookingList').length;

    await fireEvent(band.getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });
    await pass(0);

    expect(seatCard().getByText('17:00–18:30 · 1시간 30분')).toBeVisible();
    expect(seatCard().getByText('오늘 17:00–18:30')).toBeVisible();
    expect(library.requestsTo('getSeatBookingList').slice(before).at(-1)?.body).toMatchObject({
      useTime: '90',
      bookTime: '1700-1830',
    });
    expectNoWrite(library);
  });

  it('moves whole by a step of the band and keeps its length', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    const band = within(seatCard().getByTestId('slot-band'));

    await fireEvent(band.getByRole('adjustable', { name: '시간 띠' }), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    await pass(0);

    expect(seatCard().getByText('16:30–17:30 · 1시간')).toBeVisible();
  });
});
