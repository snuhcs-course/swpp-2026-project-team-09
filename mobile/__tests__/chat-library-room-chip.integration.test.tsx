/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import { STUDY_BUILDINGS } from '@/api/mock/data/study-spaces';
import type { LibrarySeat } from '@/library/replies';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, card, expectNoWrite, inCard, pressIn, startLibraryChat } from './support/library-chat';
import { AI_INPUT } from './support/lists';

// The room chip of the seat card ("공부할 자리"): the list of rooms by floor and kind with the free seats of the seat
// space each would fill, a switch and 되돌리기, and a full room swapped, against the fake main server and the fake
// library. The free seats are the design's example; the library is read for the card's time, 17:00–20:00.

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

const STUDY = '공부할 자리';

const FILLED = card(
  libraryCard('book:7F-7A-zone2:2026-11-02:1700:180', 'book', {
    space: READING_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 180,
    notes: SEAT_NOTES,
  }),
);

// The key of the card the Assistant answered with.
let shownKey = FILLED.library.key;

// The free seats of each sector for the card's time, by sectorNo, or a read that fails.
const EXAMPLE: Readonly<Record<number, number | 'fail'>> = {
  17202: 42,
  17201: 31,
  17101: 12,
  17301: 25,
  18201: 23,
  18202: 17,
  18101: 0,
};

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

// The recorded seat lists with only the first `free` seats of each sector left free.
function freeSeats(free: Readonly<Record<number, number | 'fail'>>): void {
  const recorded = library.answer.bind(library);
  jest.spyOn(library, 'answer').mockImplementation((endpoint, body) => {
    const reply = recorded(endpoint, body);
    const wanted = free[Number(body.sectorNo)];
    if (endpoint !== 'getSeatBookingList' || wanted === undefined || !reply.ok || !isSeatList(reply.result)) {
      return reply;
    }
    if (wanted === 'fail') {
      return { ok: false, error: 'network' };
    }
    let left = wanted;
    const seats = reply.result.SeatList.map((seat) => {
      if (seat.STATUS !== 1 || seat.USECNT !== 0) {
        return seat;
      }
      left -= 1;
      return left >= 0 ? seat : { ...seat, STATUS: 2, USECNT: 1 };
    });
    return { ok: true, result: { ...reply.result, SeatList: seats } };
  });
}

function seatCard(): ReturnType<typeof inCard> {
  return inCard(`library-book-${shownKey}`);
}

// The sectors read, in order.
function sectorsRead(): string[] {
  return library.requestsTo('getSeatBookingList').map(({ body }) => body.sectorNo ?? '');
}

// The Assistant answers the words with the filled card, its seat named when `seat` is given.
function ask(
  given: { free?: Readonly<Record<number, number | 'fail'>>; loggedIn?: boolean; words?: string; seat?: string } = {},
): ReturnType<typeof askForCards> {
  freeSeats(given.free ?? EXAMPLE);
  const named =
    given.seat === undefined
      ? FILLED
      : card({ ...FILLED.library, key: `${FILLED.library.key}:s=${given.seat}`, seat: given.seat });
  shownKey = named.library.key;
  return askForCards({ server, library }, [named], {
    loggedIn: given.loggedIn ?? true,
    words: given.words ?? STUDY,
  });
}

describe('the room chip', () => {
  it('names the room the Assistant picked, plain, over the space and its free seats, reading only that space', async () => {
    await ask();

    expect(seatCard().getByTestId('room-chip-plain')).toHaveTextContent('7층 열람실');
    expect(seatCard().getByText('7층 열람실 · 빈 자리 42석')).toBeVisible();
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();
    expect(sectorsRead()).toEqual(['17202']);
  });

  it("is the User's own when the words named a room", async () => {
    await ask({ words: '관정 7층 열람실 17시부터 20시까지' });

    expect(seatCard().getByTestId('room-chip-named')).toHaveTextContent('7층 열람실');
  });
});

describe('the room list', () => {
  it('opens the list in two columns with the free seats of the space each cell fills, and 그대로 closes it', async () => {
    await ask();

    await pressIn(seatCard(), '열람실: 7층 열람실');

    expect(seatCard().getByText('어느 열람실로 할까요?')).toBeVisible();
    expect(seatCard().getByText('빈 자리는 17:00–20:00 기준이에요')).toBeVisible();
    expect(seatCard().getByText('7층')).toBeVisible();
    expect(seatCard().getByText('8층')).toBeVisible();
    for (const name of ['7층 열람실 42석', '8층 정숙 열람실 23석', '7층 노트북존 31석', '8층 노트북존 17석']) {
      expect(seatCard().getByRole('button', { name })).toBeVisible();
    }
    expect(seatCard().getByRole('button', { name: '7층 열람실 42석' })).toBeSelected();
    expect(seatCard().queryByRole('button', { name: '예약하기' })).toBeNull();
    expect(sectorsRead().toSorted()).toEqual(
      ['17101', '17201', '17202', '17202', '17301', '18101', '18201', '18202'].toSorted(),
    );
    expect(
      library
        .requestsTo('getSeatBookingList')
        .every(({ body }) => body.bookTime === '1700-2000' && body.useTime === '180'),
    ).toBe(true);

    await pressIn(seatCard(), '그대로');

    expect(seatCard().queryByText('어느 열람실로 할까요?')).toBeNull();
    expect(seatCard().getByTestId('room-chip-plain')).toHaveTextContent('7층 열람실');
    expect(seatCard().getByRole('button', { name: '예약하기' })).toBeVisible();
    expectNoWrite(library);
  });
});

describe('a switch of room', () => {
  it('switches the room with one tap, reads its seats, clears the named seat, and 되돌리기 returns', async () => {
    await ask({ seat: '7200' });
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
    await pressIn(seatCard(), '열람실: 7층 열람실');

    await pressIn(seatCard(), '7층 노트북존 31석');

    expect(seatCard().getByTestId('room-chip-changed')).toHaveTextContent('7층 노트북존');
    expect(seatCard().getByText('7A 노트북존 · 빈 자리 31석')).toBeVisible();
    expect(seatCard().getByText(/^관정관 7층 7A 열람실 1 구역\(노트북존\) · \d+번$/u)).toBeVisible();
    expect(seatCard().queryByText(/7200번/u)).toBeNull();
    expect(seatCard().getByText('7층 노트북존 가운데 빈 자리가 가장 많은 곳이에요')).toBeVisible();
    expect(seatCard().getByText('7A 31석 · 7B 25석 · 171호 12석')).toBeVisible();
    expect(sectorsRead().at(-1)).toBe('17201');
    expect(seatCard().getByText('오늘 17:00–20:00')).toBeVisible();

    await pressIn(seatCard(), '되돌리기');

    expect(seatCard().getByTestId('room-chip-plain')).toHaveTextContent('7층 열람실');
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
    expect(seatCard().queryByRole('button', { name: '되돌리기' })).toBeNull();
    expectNoWrite(library);
  });

  it('books the room on screen, and a later turn sends the card of that room', async () => {
    const chat = await ask();
    await pressIn(seatCard(), '열람실: 7층 열람실');
    await pressIn(seatCard(), '8층 노트북존 17석');

    await pressIn(seatCard(), '예약하기');

    expect(library.writes().map(({ body }) => body.sectorNo)).toEqual(['18202']);
    expect(screen.getByLabelText('장소 관정관 (62-1동) 8층 8A 열람실 2 구역(노트북존)')).toBeVisible();

    await chat.user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await chat.user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(server.received('POST /assistant/messages')[1]?.body).toMatchObject({
      messages: [
        { role: 'user' },
        { role: 'assistant', cards: [{ kind: 'library', id: 'book:8F-8A-zone2-notebook:2026-11-02:1700:180' }] },
        { role: 'user', text: '고마워' },
      ],
    });
  });
});

describe('a room with no free seat, or one not read', () => {
  it('cannot tap a room with no free seat, and shows "—" for a read that failed', async () => {
    await ask({ free: { ...EXAMPLE, 18202: 0, 18201: 'fail' } });
    await pressIn(seatCard(), '열람실: 7층 열람실');

    const full = seatCard().getByRole('button', { name: '8층 노트북존 만석' });
    expect(full).toBeDisabled();
    expect(seatCard().getByText('만석')).toBeVisible();
    expect(seatCard().getByText('—')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '8층 정숙 열람실 빈 자리 모름' })).toBeEnabled();

    await pressIn(seatCard(), '8층 노트북존 만석');

    expect(seatCard().getByText('어느 열람실로 할까요?')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '7층 열람실 42석' })).toBeSelected();
  });
});

describe('the room list without a library session', () => {
  it('shows the names only without a library session, reads nothing, and fills the largest space of a room', async () => {
    await ask({ loggedIn: false });

    await pressIn(seatCard(), '열람실: 7층 열람실');

    expect(seatCard().getByText('로그인하면 좌석 현황을 볼 수 있어요')).toBeVisible();
    for (const name of ['7층 열람실', '8층 정숙 열람실', '7층 노트북존', '8층 노트북존']) {
      expect(seatCard().getByRole('button', { name })).toBeVisible();
    }
    expect(library.requests).toEqual([]);

    await pressIn(seatCard(), '7층 노트북존');

    expect(seatCard().getByTestId('room-chip-changed')).toHaveTextContent('7층 노트북존');
    expect(seatCard().getByText('7B 노트북존')).toBeVisible();
    expect(library.requests).toEqual([]);
  });
});

describe('a full room', () => {
  it('is swapped for the space of the same kind with the most free seats, with no 되돌리기', async () => {
    await ask({ free: { ...EXAMPLE, 17202: 0 } });

    expect(seatCard().getByTestId('room-chip-changed')).toHaveTextContent('8층 정숙 열람실');
    expect(seatCard().getByText('7층 열람실은 그 시간에 다 찼어요')).toBeVisible();
    expect(seatCard().getByText('8층 정숙 열람실 · 빈 자리 23석')).toBeVisible();
    expect(seatCard().getByText(/^관정관 8층 8A 열람실 1 구역\(QUIET ZONE\) · \d+번$/u)).toBeVisible();
    expect(seatCard().queryByRole('button', { name: '되돌리기' })).toBeNull();
    expect(seatCard().queryByText('그 시간에 빈 자리가 없어요')).toBeNull();
    expectNoWrite(library);
  });

  it('keeps "그 시간에 빈 자리가 없어요" when every space is full', async () => {
    const allFull = Object.fromEntries(Object.keys(EXAMPLE).map((sectorNo) => [Number(sectorNo), 0]));
    await ask({ free: allFull });

    expect(seatCard().getByText('그 시간에 빈 자리가 없어요')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '좌석 현황 보기' })).toBeVisible();
    expect(seatCard().getByTestId('room-chip-plain')).toHaveTextContent('7층 열람실');
  });
});
