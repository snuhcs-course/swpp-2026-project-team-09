/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type { LibrarySeat } from '@/library/replies';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  card,
  expectNoWrite,
  inCard,
  pressIn,
  SEAT_CARD,
  sendFromBar,
  startLibraryChat,
} from './support/library-chat';

// The seat book card's time and seat, kept with the chat (P15 ticket 57, the review of #360): a time moved on the
// band and a seat picked are sent back as the card on screen; the room chip's counts follow a new time; and a time
// whose start went by while the card was open is never booked.

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

const FILLED = card(
  libraryCard('book:7F-7A-zone2:2026-11-02:1700:180', 'book', {
    space: READING_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 180,
    notes: SEAT_NOTES,
  }),
);

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat());
  server.on('GET /study-spaces', { status: 200, body: STUDY_BUILDINGS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function isSeatList(value: unknown): value is { SeatList: LibrarySeat[] } {
  return typeof value === 'object' && value !== null && 'SeatList' in value && Array.isArray(value.SeatList);
}

// 7층 열람실 (17202) has no free seat for a time from 17:00, and its recorded seats for any other.
function fullAtFive(): void {
  const recorded = library.answer.bind(library);
  jest.spyOn(library, 'answer').mockImplementation((endpoint, body) => {
    const reply = recorded(endpoint, body);
    const full = body.sectorNo === '17202' && (body.bookTime ?? '').startsWith('1700');
    if (endpoint !== 'getSeatBookingList' || !full || !reply.ok || !isSeatList(reply.result)) {
      return reply;
    }
    const seats = reply.result.SeatList.map((seat) => ({ ...seat, STATUS: 2, USECNT: 1 }));
    return { ok: true, result: { ...reply.result, SeatList: seats } };
  });
}

function filledCard(): ReturnType<typeof inCard> {
  return inCard(`library-book-${FILLED.library.key}`);
}

async function stepBand(name: string, actionName: 'increment' | 'decrement'): Promise<void> {
  const band = within(filledCard().getByTestId('slot-band'));
  await fireEvent(band.getByRole('adjustable', { name }), 'accessibilityAction', { nativeEvent: { actionName } });
  await pass(0);
}

describe('the card kept with the chat', () => {
  it('sends back the time moved on the band and the seat picked, as the card on screen', async () => {
    const chat = await askForCards({ server, library }, [FILLED], { words: '공부할 자리' });

    await stepBand('시간 띠', 'increment');
    expect(filledCard().getByText('17:30–20:30 · 3시간')).toBeVisible();
    expect(filledCard().getByText('바꾼 시간이에요. 위 답의 시각은 처음 시간 기준이에요.')).toBeVisible();
    await pressIn(filledCard(), '자리 선택하기');
    const picture = within(screen.getByTestId('seat-map-large'));
    await pressIn(picture, '7200번 빈 자리');
    await pressIn(picture, '7200번 선택');

    await sendFromBar(chat.user, '8층으로 바꿔 줘');

    expect(server.received('POST /assistant/messages')[1]?.body).toMatchObject({
      messages: [
        { role: 'user' },
        { role: 'assistant', cards: [{ kind: 'library', id: 'book:7F-7A-zone2:2026-11-02:1730:180:s=7200' }] },
        { role: 'user', text: '8층으로 바꿔 줘' },
      ],
    });
  });
});

describe('the room chip after a new time', () => {
  it('reads the counts again, and no longer says the room swapped out is full', async () => {
    fullAtFive();
    await askForCards({ server, library }, [FILLED], { words: '공부할 자리' });
    expect(filledCard().getByText('7층 열람실은 그 시간에 다 찼어요')).toBeVisible();
    const read = library.requestsTo('getSeatBookingList').length;

    await stepBand('시간 띠', 'increment');
    await pass(0);

    expect(library.requestsTo('getSeatBookingList').length).toBeGreaterThan(read + 1);
    expect(filledCard().queryByText('7층 열람실은 그 시간에 다 찼어요')).toBeNull();
  });
});

describe('a card left open past its start', () => {
  it('books nothing when the start went by before 예약하기, and says so', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    const seatCard = inCard(`library-book-${SEAT_CARD.library.key}`);
    expect(seatCard.getByText('오늘 17:00–18:00')).toBeVisible();

    // 17:10: the next start is 17:30.
    jest.setSystemTime(new Date('2026-11-02T08:10:00.000Z'));
    await pressIn(seatCard, '예약하기');
    await pass(0);

    expect(seatCard.getByText('시작 시각이 지났어요. 시간을 다시 골라 주세요.')).toBeVisible();
    expectNoWrite(library);
  });
});
