/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import {
  GROUP_ROOM,
  libraryCard,
  READING_ROOM,
  ROOM_NOTES,
  SEAT_NOTES,
  STUDIO,
  STUDIO_PLEDGE,
} from '@/api/mock/data/library';
import { seatMapUrl } from '@/library/site';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { FAKE_ROOM_FORM, type FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  card,
  expectNothingOfTheLibrarySent,
  expectNoWrite,
  inCard,
  pressIn,
  startLibraryChat,
} from './support/library-chat';

// The room book card and the seats card in the chat, and what a chat request sends of a library card, against the
// fake main server and the fake library. M4: no test sees a write before the confirm press.

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

const ROOM_CARD = card(
  libraryCard('book:4F-group-6:2026-11-02:1700:60', 'book', {
    space: GROUP_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
    notes: ROOM_NOTES,
  }),
);

const STUDIO_CARD = card(
  libraryCard('book:6F-studio:2026-11-02:1500:60', 'book', {
    space: STUDIO,
    date: '2026-11-02',
    start: '15:00',
    minutes: 60,
    useDesc: '콘텐츠제작',
    pledge: STUDIO_PLEDGE,
  }),
);

describe('the room book card', () => {
  it('offers the first free room for the slot, asks the 사용 용도, and books for the applicant alone on 예약하기', async () => {
    await askForCards({ server, library }, [ROOM_CARD]);
    const shown = inCard(`library-book-${ROOM_CARD.library.key}`);

    expect(library.requestsTo('getRoomList')[0]?.body).toMatchObject({
      searchDate: '20261102',
      roomNo: '141',
      sectorNo: '14103',
      sectorName: '6인실',
      roomName: '그룹스터디룸',
    });
    expect(shown.getByText('관정관 4층 그룹스터디룸 6인실 · G412')).toBeVisible();
    expect(shown.getByRole('button', { name: '예약하기' })).toBeDisabled();
    expectNoWrite(library);

    await pressIn(shown, '과제');
    expectNoWrite(library);
    await pressIn(shown, '예약하기');

    expect(library.writes()).toEqual([
      {
        endpoint: 'setRoomBooking',
        body: {
          roomNo: '141',
          sectorNo: '14103',
          seatNo: '14103009',
          bookTime: '1700-1800',
          bookDate: '20261102',
          useDesc: '과제',
          phoneNum: FAKE_ROOM_FORM.phoneNum,
          eMail: FAKE_ROOM_FORM.eMail,
          sMemberJsInfo: '김새내,202600001',
        },
      },
    ]);
    expect(screen.getByText('G412 예약되었어요!')).toBeVisible();
    expect(screen.getByLabelText('방 G412')).toBeVisible();
    expect(screen.queryByText(/좌석배정기/u)).toBeNull();
    expect(screen.getByText(/사용 다했으면 꼭 반납처리를 해주세요!/u)).toBeVisible();
    expectNothingOfTheLibrarySent(server, ['G412']);
  });
});

describe('the room book card when no room is free or a 서약서 is asked', () => {
  it('gives the nearest free starts that day when no room is free, and takes one', async () => {
    const late = card({ ...ROOM_CARD.library, key: 'book:4F-group-6:2026-11-02:1900:60', start: '19:00' });
    await askForCards({ server, library }, [late]);
    const shown = inCard(`library-book-${late.library.key}`);

    expect(shown.getByText('그 시간에 빈 방이 없어요')).toBeVisible();
    await pressIn(shown, '18:00부터');

    expect(shown.getByText('오늘 18:00–19:00')).toBeVisible();
    expectNoWrite(library);
  });

  it('waits for the 서약서 of a media room before 예약하기', async () => {
    await askForCards({ server, library }, [STUDIO_CARD]);
    const shown = inCard(`library-book-${STUDIO_CARD.library.key}`);

    expect(shown.getByText(STUDIO_PLEDGE)).toBeVisible();
    expect(shown.getByRole('button', { name: '예약하기' })).toBeDisabled();
    await pressIn(shown, '서약서 동의', 'checkbox');
    expect(shown.getByRole('checkbox', { name: '서약서 동의' })).toBeChecked();
    expectNoWrite(library);

    await pressIn(shown, '예약하기');

    expect(library.writes()[0]?.body).toMatchObject({
      seatNo: '16201001',
      useDesc: '콘텐츠제작',
      bookTime: '1500-1600',
    });
  });
});

const SEATS_CARD = card(
  libraryCard('seats:7F-7A-zone2:2026-11-02', 'seats', { space: READING_ROOM, notes: SEAT_NOTES }),
);

async function laidOut(width: number): Promise<void> {
  await fireEvent(screen.getByTestId('seat-map-room'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 0 } },
  });
  await pass(0);
}

describe('the seats card', () => {
  it("draws the site's map at the card's width, each seat at its scaled POSX and POSY, with the free count", async () => {
    await askForCards({ server, library }, [SEATS_CARD], { words: '지금 관정 7층 좌석현황 보고 싶어' });
    await laidOut(2529 / 10);

    const image = screen.getByTestId('seat-map-small-image');
    expect(image.props.source).toEqual({ uri: seatMapUrl(17202) });
    const scale = 252.9 / 2529;
    expect(image).toHaveStyle({ width: 252.9, height: (252.9 * 1198) / 2529 });
    // 7193 is at 538, 41 on the image.
    expect(screen.getByRole('button', { name: '7193번 빈 자리' })).toHaveStyle({
      left: 538 * scale,
      top: 41 * scale,
      width: 33 * scale,
      height: 28 * scale,
      backgroundColor: '#F89200',
    });
    expect(screen.getByText(/관정관 7층 7A 열람실 2 구역 · 지금 기준 · 빈 자리 \d+석/u)).toBeVisible();
    expect(library.requestsTo('getSeatBookingList')[0]?.body).toMatchObject({ bookTime: '1600-1800', useTime: '120' });
    expectNoWrite(library);
  });

  it('colours a taken seat pale and makes it no button', async () => {
    library.takeSeat(17202001);
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut(300);

    expect(screen.queryByRole('button', { name: '7193번 빈 자리' })).toBeNull();
    expect(screen.getByTestId('seat-7193')).toHaveStyle({ backgroundColor: '#F3F0E6' });
  });
});

describe('the seats card, large and tapped', () => {
  it('opens the large view 300 high with its title, and a tapped free seat gives a seat book card for 2 hours', async () => {
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut(300);

    await pressIn(inCard(`library-seats-${SEATS_CARD.library.key}`), '좌석 현황 크게 보기');
    expect(screen.getByText('관정관 7층 7A 열람실 2 구역 좌석 현황')).toBeVisible();
    expect(screen.getByText('옆으로 밀어서 보기')).toBeVisible();
    expect(screen.getByTestId('seat-map-large-map-image')).toHaveStyle({ height: 300, width: (300 * 2529) / 1198 });

    await pressIn(screen, '7200번 빈 자리');

    const given = inCard('library-book-book:7F-7A-zone2:2026-11-02:1600:120:s=7200');
    expect(given.getByText('관정관 7층 7A 열람실 2 구역 · 7200번')).toBeVisible();
    expect(given.getByText('오늘 16:00–18:00')).toBeVisible();
    await pressIn(given, '이용 시간 30분 늘리기');
    expect(given.getByText('오늘 16:00–18:30')).toBeVisible();
    expectNoWrite(library);
    expect(server.received('POST /assistant/messages')).toHaveLength(1);
  });

  it('lists the rooms of a room sector with their free times and photos', async () => {
    const rooms = card(libraryCard('seats:6F-studio:2026-11-02', 'seats', { space: STUDIO, date: '2026-11-02' }));
    await askForCards({ server, library }, [rooms], { words: '스튜디오 빈 시간' });

    expect(screen.getByLabelText('STUDIO A 09:00–17:00')).toBeVisible();
    expectNoWrite(library);
  });
});

describe('the chat request', () => {
  it('says the app draws library cards, and sends a library card back by its key alone', async () => {
    const chat = await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });

    expect(server.received('POST /assistant/messages')[0]?.body).toEqual({
      clientCapabilities: ['library'],
      messages: [{ role: 'user', text: '좌석현황' }],
    });
    await chat.user.type(screen.getByLabelText('AI에게 메시지'), '고마워');
    await chat.user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(server.received('POST /assistant/messages')[1]?.body).toMatchObject({
      clientCapabilities: ['library'],
      messages: [
        { role: 'user' },
        { role: 'assistant', cards: [{ kind: 'library', id: 'seats:7F-7A-zone2:2026-11-02' }] },
        { role: 'user' },
      ],
    });
    expectNothingOfTheLibrarySent(server, ['7193']);
  });
});

describe('the seats card after closing time', () => {
  it('offers no 자리 예약하기 and no seat to tap at 23:10', async () => {
    jest.useRealTimers();
    ({ server, library } = await startLibraryChat(new Date('2026-11-02T14:10:00.000Z')));
    await askForCards({ server, library }, [SEATS_CARD], { words: '좌석현황' });
    await laidOut(300);

    expect(screen.queryByRole('button', { name: '자리 예약하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '7193번 빈 자리' })).toBeNull();
    expect(screen.getByText('오늘은 예약 시간이 끝났어요')).toBeVisible();
    expectNoWrite(library);
  });
});
