/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { libraryCard } from '@/api/mock/data/library';
import { keepRoomBooking } from '@/library/room-bookings';
import { ALL_CONSENTED, forgetPartyRequests, rejectedWords, SEND_ASK } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { COMPANIONS, JI_WOO, MIN_JUN, PARTY_CARD, readyCard, REQUEST_ID, requestOf } from './support/room-requests';
import type { FakeServer } from './support/fake-server';
import { FAKE_ROOM_FORM, type FakeLibrary } from './support/kwanjeong/fake-library';
import {
  askForCards,
  bookingRow,
  card,
  expectNothingOfTheLibrarySent,
  expectNoWrite,
  inCard,
  pressIn,
  startLibraryChat,
} from './support/library-chat';

// A room card with companions runs a room request, against the fake main server and the fake library: the request,
// its polling until "모두 동의했어요", the companions checked with the library and booked after the applicant, what
// the server is told, the consent dialog and the notices on the main screen, and the cancel's report. M4: no write
// before the confirm press.

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
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat());
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('a room card with friends', () => {
  it('sends the consent request, waits, and enables 예약하기 on 모두 동의했어요', async () => {
    server.on('POST /library/room-requests', { status: 201, body: requestOf('gathering') });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('gathering') });
    await askForCards({ server, library }, [PARTY_CARD], { words: '민준, 지우랑 4층 스터디룸' });
    const shown = inCard(`library-book-${PARTY_CARD.library.key}`);
    await pressIn(shown, '과제');

    expect(shown.getByRole('button', { name: '예약하기' })).toBeDisabled();

    await pressIn(shown, SEND_ASK);

    const sent = server.received('POST /library/room-requests')[0];
    expect(sent?.body).toEqual({
      key: PARTY_CARD.library.key,
      friendIds: [MIN_JUN.friendId, JI_WOO.friendId],
      useDesc: '과제',
    });
    expect(screen.getByText(/친구들의 동의를 기다리고 있어요 \(0\/2\)/u)).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeDisabled();

    server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('ready') });
    await pass(3500);

    expect(screen.getByText(ALL_CONSENTED)).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeEnabled();
    expectNoWrite(library);
  });
});

describe('a room card with friends on 예약하기', () => {
  it('on 예약하기 checks each companion and books them after the applicant, with hyphen-free 학번', async () => {
    server.on(`GET /library/room-requests/${REQUEST_ID}/companions`, { status: 200, body: COMPANIONS });
    server.on(`POST /library/room-requests/${REQUEST_ID}/result`, { status: 204 });
    const shown = await readyCard({ server, library });
    expectNoWrite(library);
    expect(library.requestsTo('getUserCheck')).toEqual([]);

    await pressIn(shown, '예약하기');

    expect(library.requestsTo('getUserCheck').map(({ body }) => body)).toEqual([
      { pRoomNo: '141', pUserName: '김민준', pSchoolNo: '202600002' },
      { pRoomNo: '141', pUserName: '서지우', pSchoolNo: '202600003' },
    ]);
    expect(library.writes()[0]?.body).toMatchObject({
      sMemberJsInfo: '김새내,202600001,김민준,202600002,서지우,202600003',
    });
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/result`).map(({ body }) => body)).toEqual([
      { ok: true },
    ]);
    expect(screen.getByText('G412 예약되었어요!')).toBeVisible();
    expectNothingOfTheLibrarySent(server, ['G412', '2000001', FAKE_ROOM_FORM.tmpUserNames]);
  });
});

describe('a room card with friends when it cannot book', () => {
  it('asks a companion the library did not recognise to check, and books nothing', async () => {
    server.on(`GET /library/room-requests/${REQUEST_ID}/companions`, { status: 200, body: COMPANIONS });
    server.on(`POST /library/room-requests/${REQUEST_ID}/result`, { status: 204 });
    library.refuseUser('202600003');
    const shown = await readyCard({ server, library });

    await pressIn(shown, '예약하기');

    expect(screen.getByText(rejectedWords('서지우'))).toBeVisible();
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/result`).map(({ body }) => body)).toEqual([
      { ok: false, failedUserId: JI_WOO.friendId },
    ]);
    expectNoWrite(library);
  });

  it('shows the dissolve on the card', async () => {
    server.on('POST /library/room-requests', { status: 201, body: requestOf('gathering') });
    server.on(`GET /library/room-requests/${REQUEST_ID}`, {
      status: 200,
      body: requestOf('dissolved', { reason: '파티 구성원이 제안을 거절했습니다', consents: [] }),
    });
    await askForCards({ server, library }, [PARTY_CARD], { words: '민준, 지우랑 4층 스터디룸' });
    await pressIn(inCard(`library-book-${PARTY_CARD.library.key}`), SEND_ASK);
    await pass(100);

    expect(screen.getByText('파티 구성원이 제안을 거절했습니다')).toBeVisible();
    expect(screen.getByRole('button', { name: '예약하기' })).toBeDisabled();
  });
});

describe('the cancel of a room booked through a room request', () => {
  it('reports cancelled with no body after setCancelBooking, and no library data', async () => {
    library.addBooking(bookingRow());
    await keepRoomBooking(3000001, REQUEST_ID);
    server.on(`POST /library/room-requests/${REQUEST_ID}/cancelled`, { status: 204 });
    const cancel = card(libraryCard('cancel:-:2026-11-02:-', 'cancel', { target: { date: '2026-11-02' } }));
    await askForCards({ server, library }, [cancel], { words: '오늘 예약 취소해줘' });

    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/cancelled`)).toEqual([]);

    await pressIn(inCard(`library-cancel-${cancel.library.key}`), '취소하기');

    expect(library.writes()).toEqual([{ endpoint: 'setCancelBooking', body: { bseqno: '3000001' } }]);
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/cancelled`).map(({ body }) => body)).toEqual([
      null,
    ]);
    expectNothingOfTheLibrarySent(server, ['3000001']);
  });
});
