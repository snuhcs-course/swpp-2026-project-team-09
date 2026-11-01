/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { GROUP_ROOM, libraryCard, ROOM_NOTES } from '@/api/mock/data/library';
import type { RoomRequest } from '@/api/room-requests';
import { keepRoomBooking } from '@/library/room-bookings';
import { ALL_CONSENTED, forgetPartyRequests, rejectedWords, SEND_ASK } from '@/screens/main/library/room-party';
import { consentTitle } from '@/screens/main/room-consent';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
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
import { LOBBY } from './support/server';

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

const REQUEST_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const MIN_JUN = { friendId: 'bbbbbbbb-0000-4000-8000-000000000002', name: '김민준' };
const JI_WOO = { friendId: 'bbbbbbbb-0000-4000-8000-000000000003', name: '서지우' };

const PARTY_CARD = card(
  libraryCard('book:4F-group-6:2026-11-02:1700:60', 'book', {
    space: GROUP_ROOM,
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDescOptions: ['강의', '과제', '동아리활동', '연구', '취업', '기타'],
    notes: ROOM_NOTES,
    companions: [MIN_JUN, JI_WOO],
  }),
);

function requestOf(status: RoomRequest['status'], more: Partial<RoomRequest> = {}): RoomRequest {
  return {
    id: REQUEST_ID,
    status,
    questId: 'cccccccc-0000-4000-8000-000000000004',
    madeForBooking: true,
    requester: { userId: 'me', name: '홍길동' },
    space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
    date: '2026-11-02',
    start: '17:00',
    minutes: 60,
    useDesc: null,
    reason: null,
    failed: null,
    consents: [MIN_JUN, JI_WOO].map(({ friendId, name }) => ({
      userId: friendId,
      name,
      consented: status === 'ready',
    })),
    ...more,
  };
}

const COMPANIONS = [
  { userId: MIN_JUN.friendId, registeredName: '김민준', studentNumber: '2026-00002' },
  { userId: JI_WOO.friendId, registeredName: '서지우', studentNumber: '202600003' },
];

// The card with its request sent and every companion consenting by the next poll.
async function readyCard(): Promise<ReturnType<typeof inCard>> {
  server.on('POST /library/room-requests', { status: 201, body: requestOf('gathering') });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('gathering') });
  await askForCards({ server, library }, [PARTY_CARD], { words: '민준, 지우랑 4층 스터디룸' });
  const shown = inCard(`library-book-${PARTY_CARD.library.key}`);
  await pressIn(shown, '과제');
  await pressIn(shown, SEND_ASK);
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: requestOf('ready') });
  await pass(3500);
  return inCard(`library-book-${PARTY_CARD.library.key}`);
}

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
    const shown = await readyCard();
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
    const shown = await readyCard();

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

const ASK = {
  requestId: REQUEST_ID,
  requester: { userId: 'other', name: '이부커' },
  space: { id: '4F-group-6', name: '그룹스터디룸 6인실' },
  date: '2026-11-03',
  start: '15:00',
  minutes: 60,
  consented: null,
  recheck: false,
};

describe('the main screen', () => {
  it('asks for the consent with the registered name and 학번, asking for them first when 내 정보 has none', async () => {
    server.on('GET /library/room-requests', { status: 200, body: { asks: [ASK], notices: [] } });
    server.on('PATCH /users/me/profile', {
      status: 200,
      body: { ...LOBBY.profile, studentNumber: '202612345', registeredName: '홍길동' },
    });
    server.on(`POST /library/room-requests/${REQUEST_ID}/consent`, { status: 200, body: requestOf('gathering') });
    const chat = await askForCards({ server, library }, [], { words: '안녕' });

    expect(screen.getByText(consentTitle('홍길동'))).toBeVisible();

    await chat.user.type(screen.getByLabelText('학번'), '2026-12345');
    await chat.user.press(screen.getByRole('button', { name: '제공하고 참여' }));
    await pass(100);

    expect(server.received('PATCH /users/me/profile')[0]?.body).toEqual({
      registeredName: '홍길동',
      studentNumber: '202612345',
    });
    expect(server.received(`POST /library/room-requests/${REQUEST_ID}/consent`)).toHaveLength(1);
  });

  it('shows each notice once and marks it seen', async () => {
    const notice = {
      id: 'dddddddd-0000-4000-8000-000000000005',
      requestId: REQUEST_ID,
      text: '파티 구성원이 제안을 거절했습니다',
    };
    server.on('GET /library/room-requests', { status: 200, body: { asks: [], notices: [notice] } });
    server.on(`POST /library/room-notices/${notice.id}/seen`, { status: 204 });
    await askForCards({ server, library }, [], { words: '안녕' });

    expect(screen.getByText('파티 구성원이 제안을 거절했습니다')).toBeVisible();
    expect(server.received(`POST /library/room-notices/${notice.id}/seen`)).toHaveLength(1);
  });
});
