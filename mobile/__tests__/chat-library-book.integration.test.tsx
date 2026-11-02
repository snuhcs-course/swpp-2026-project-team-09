/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCard, READING_ROOM, SEAT_NOTES } from '@/api/mock/data/library';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { type FakeLibrary, TAKEN_SEAT_MESSAGE } from './support/kwanjeong/fake-library';
import {
  askForCards,
  card,
  expectNothingOfTheLibrarySent,
  expectNoWrite,
  inCard,
  pressIn,
  SEAT_CARD,
  startLibraryChat,
} from './support/library-chat';
import { navigate } from './support/library-session';
import { AI_INPUT } from './support/lists';

// The book card of a reading-room seat in the chat (MainChatLibReserve) and its done message (MainChatLibReserved),
// against the fake main server and the fake library. M4: no test sees a write before the confirm press.

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

const SEAT_TEST_ID = `library-book-${SEAT_CARD.library.key}`;

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
  return inCard(SEAT_TEST_ID);
}

async function press(name: string): Promise<void> {
  await pressIn(seatCard(), name);
}

describe('the seat book card', () => {
  it("reads the sector's seats for the time and offers the first free seat in label order, writing nothing", async () => {
    await askForCards({ server, library }, [SEAT_CARD]);

    expect(library.requestsTo('getSeatBookingList')).toEqual([
      {
        endpoint: 'getSeatBookingList',
        body: {
          roomNo: '172',
          sectorNo: '17202',
          useTime: '60',
          bookDate: '20261102',
          bookTime: '1700-1800',
          seatNo: '',
          sMemberJsInfo: '',
        },
      },
    ]);
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7193번')).toBeVisible();
    expect(seatCard().getByText('오늘 17:00–18:00')).toBeVisible();
    for (const name of ['예약하기', '다른 자리 고르기', '취소']) {
      expect(seatCard().getByRole('button', { name })).toBeVisible();
    }
    expect(seatCard().getByText(`· ${SEAT_NOTES[0] ?? ''}`)).toBeVisible();
    expectNoWrite(library);
  });

  it('offers the named seat while it is free', async () => {
    const named = card({ ...SEAT_CARD.library, key: 'book:7F-7A-zone2:2026-11-02:1700:60:s=7200', seat: '7200' });
    await askForCards({ server, library }, [named]);

    expect(inCard(`library-book-${named.library.key}`).getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
  });
});

describe('예약하기 on the seat book card', () => {
  it("books it on 예약하기 with the site's seat form, and appends the done message as the app's own bubble", async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expectNoWrite(library);

    await press('예약하기');

    expect(library.writes()).toEqual([
      {
        endpoint: 'setRoomBooking',
        body: {
          roomNo: '172',
          sectorNo: '17202',
          useTime: '60',
          bookDate: '20261102',
          bookTime: '1700-1800',
          seatNo: '17202001',
          sMemberJsInfo: '',
        },
      },
    ]);
    const done = screen.getByTestId('library-done');
    expect(screen.getByText('7193번 예약되었어요!')).toBeVisible();
    expect(screen.getByLabelText('장소 관정관 (62-1동) 7층 7A 열람실 2 구역')).toBeVisible();
    expect(screen.getByLabelText('좌석 7193번')).toBeVisible();
    expect(screen.getByLabelText('시간 오늘 17:00–18:00')).toBeVisible();
    expect(screen.getByLabelText('예약 번호 2000001')).toBeVisible();
    expect(screen.getByText(/30분 안에 좌석배정기\(키오스크\)에서 확인해 주세요/u)).toBeVisible();
    expect(screen.getByText(/사용 다했으면 꼭 반납처리를 해주세요!/u)).toBeVisible();
    expect(done).toBeVisible();
    expect(seatCard().queryByRole('button', { name: '예약하기' })).toBeNull();
  });
});

describe('the done message', () => {
  it('never sends the done message, the booking number or the seat to the main server', async () => {
    const chat = await askForCards({ server, library }, [SEAT_CARD]);
    await press('예약하기');

    await chat.user.type(screen.getByLabelText(AI_INPUT), '고마워');
    await chat.user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    const sent = server.received('POST /assistant/messages');
    expect(sent).toHaveLength(2);
    expect(sent[1]?.body).toEqual({
      clientCapabilities: ['library'],
      messages: [
        { role: 'user', text: '관정 7층 열람실 17시에 한 시간 예약해줘' },
        { role: 'assistant', text: '카드에서 확인해 주세요.', cards: [{ kind: 'library', id: SEAT_CARD.library.key }] },
        { role: 'user', text: '고마워' },
      ],
    });
    expectNothingOfTheLibrarySent(server, ['7193', '2000001']);
  });
});

describe('취소 and 다른 자리 고르기 on the seat book card', () => {
  it('says "알겠어요. 예약하지 않았어요." on 취소 and books nothing', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);

    await press('취소');

    expect(screen.getByText('알겠어요. 예약하지 않았어요.')).toBeVisible();
    expect(seatCard().queryByRole('button', { name: '예약하기' })).toBeNull();
    expectNoWrite(library);
    expect(server.received('POST /assistant/messages')).toHaveLength(1);
  });

  it('lets 다른 자리 고르기 pick another free seat on the large map', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);

    await press('다른 자리 고르기');
    expect(screen.getByText('관정관 7층 7A 열람실 2 구역 좌석 현황')).toBeVisible();
    await pressIn(screen, '7300번 빈 자리');

    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7300번')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the seat book card when no seat is free', () => {
  it('says "그 시간에 빈 자리가 없어요" with 좌석 현황 보기', async () => {
    const seats = libraryCard('book:7F-7A-zone2:2026-11-02:1700:60', 'book', SEAT_CARD.library);
    jest.spyOn(library, 'answer').mockImplementation(function answer(this: FakeLibrary, endpoint, body) {
      this.requests.push({ endpoint, body });
      return endpoint === 'getSeatBookingList'
        ? { ok: true, result: { successYN: 'Y', SeatList: [] } }
        : { ok: true, result: { successYN: 'Y' } };
    });
    await askForCards({ server, library }, [card(seats)]);

    expect(seatCard().getByText('그 시간에 빈 자리가 없어요')).toBeVisible();
    await press('좌석 현황 보기');
    expect(screen.getByText('관정관 7층 7A 열람실 2 구역 좌석 현황이에요.')).toBeVisible();
    expectNoWrite(library);
  });
});

describe("the seat book card's failures", () => {
  it("shows the library's own words when it refuses", async () => {
    library.refuseBookings('예약 가능 시간이 아닙니다.');
    await askForCards({ server, library }, [SEAT_CARD]);
    expectNoWrite(library);

    await press('예약하기');

    expect(seatCard().getByText('예약하지 못했어요: 예약 가능 시간이 아닙니다.')).toBeVisible();
    expect(screen.queryByTestId('library-done')).toBeNull();
  });

  it('says the seat was just taken and offers the next free seat', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expectNoWrite(library);
    library.takeSeat(17202001);

    await press('예약하기');

    expect(library.writes()).toHaveLength(1);
    expect(seatCard().getByText('그 자리는 방금 다른 사람이 예약했어요')).toBeVisible();
    expect(seatCard().getByText('관정관 7층 7A 열람실 2 구역 · 7194번')).toBeVisible();
    expect(seatCard().queryByText(new RegExp(TAKEN_SEAT_MESSAGE, 'u'))).toBeNull();
  });

  it('says only "예약하지 못했어요" when 대학원 열람실 refuses', async () => {
    library.refuseBookings('대학원생만 예약할 수 있습니다.');
    const graduate = card({
      ...SEAT_CARD.library,
      key: 'book:8F-grad-reading-room:2026-11-02:1700:60',
      space: {
        ...READING_ROOM,
        id: '8F-grad-reading-room',
        name: '대학원 열람실',
        floor: 8,
        roomNo: 183,
        sectorNo: 18301,
      },
    });
    await askForCards({ server, library }, [graduate]);
    const shown = inCard(`library-book-${graduate.library.key}`);

    await pressIn(shown, '예약하기');

    expect(shown.getByText('예약하지 못했어요')).toBeVisible();
    expect(shown.queryByText(/대학원생만/u)).toBeNull();
  });
});

describe("the seat book card's network and session", () => {
  it('says it could not reach the library when the network fails', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    library.answerNext('network');

    await press('예약하기');

    expect(seatCard().getByText('도서관 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.')).toBeVisible();
  });

  it('asks for the library login when there is none, and reads nothing', async () => {
    await askForCards({ server, library }, [SEAT_CARD], { loggedIn: false });

    expect(seatCard().getByText('관정도서관 로그인이 필요해요')).toBeVisible();
    expect(seatCard().getByRole('button', { name: '로그인' })).toBeVisible();
    expect(library.requests).toEqual([]);
  });

  it('logs in again when the session ended, then sends the pressed booking once more', async () => {
    await askForCards({ server, library }, [SEAT_CARD]);
    expectNoWrite(library);
    library.answerNext('sessionEnded');

    await press('예약하기');
    expect(seatCard().getByText('관정도서관 로그인이 끝났어요. 다시 로그인해 주세요.')).toBeVisible();
    expect(library.writes()).toHaveLength(1);

    await press('로그인');
    await navigate('https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main');
    await pass(0);
    await pass(0);

    expect(library.writes()).toHaveLength(2);
    expect(screen.getByText('7193번 예약되었어요!')).toBeVisible();
  });
});
