/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RoomRequest } from '@/api/room-requests';
import { ASK_ONE_MORE, SEND_ONE_MORE } from '@/screens/main/library/room-ask-more';
import { forgetPartyRequests, SEND_ASK } from '@/screens/main/library/room-party';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { JI_WOO, MIN_JUN, PARTY_CARD, REQUEST_ID, requestOf } from './support/room-requests';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { askForCards, expectNoWrite, inCard, pressIn, startLibraryChat } from './support/library-chat';

// A study room's plan stays when a companion goes out (P05 ticket 06): the booker's card says who consented, who is
// asked and who is out, how many more the room needs, and asks one more Friend through the Friend picker, against the
// fake main server. A request from a server that sends neither `companions` nor `moreNeeded` shows as before.

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

const HA_EUN = { friendId: 'bbbbbbbb-0000-4000-8000-000000000005', name: '박하은' };

const FRIENDS = [MIN_JUN, JI_WOO, HA_EUN].map(({ friendId, name }) => ({
  id: friendId,
  name,
  department: '컴퓨터공학부',
  sharing: true,
  visible: false,
}));

// 김민준 consented and 서지우 declined: the six-person room needs one more.
const ONE_OUT: RoomRequest = requestOf('gathering', {
  consents: [
    { userId: MIN_JUN.friendId, name: MIN_JUN.name, consented: true },
    { userId: JI_WOO.friendId, name: JI_WOO.name, consented: false },
  ],
  companions: [
    { userId: MIN_JUN.friendId, name: MIN_JUN.name, state: 'consented' },
    { userId: JI_WOO.friendId, name: JI_WOO.name, state: 'declined' },
  ],
  moreNeeded: 1,
});

// 박하은 asked after that.
const ONE_MORE_ASKED: RoomRequest = {
  ...ONE_OUT,
  consents: [...ONE_OUT.consents, { userId: HA_EUN.friendId, name: HA_EUN.name, consented: null }],
  companions: [...(ONE_OUT.companions ?? []), { userId: HA_EUN.friendId, name: HA_EUN.name, state: 'asked' }],
  moreNeeded: 0,
};

const CARD_ID = `library-book-${PARTY_CARD.library.key}`;

let server: FakeServer;
let library: FakeLibrary;

beforeEach(async () => {
  forgetPartyRequests();
  ({ server, library } = await startLibraryChat());
  server.on('GET /friends', { status: 200, body: FRIENDS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// The card with its request sent, as the server answers it from then on.
async function cardWith(request: RoomRequest): Promise<ReturnType<typeof inCard>> {
  server.on('POST /library/room-requests', { status: 201, body: requestOf('gathering') });
  server.on(`GET /library/room-requests/${REQUEST_ID}`, { status: 200, body: request });
  await askForCards({ server, library }, [PARTY_CARD], { words: '민준, 지우랑 4층 스터디룸' });
  const shown = inCard(CARD_ID);
  await pressIn(shown, '과제');
  await pressIn(shown, SEND_ASK);
  await pass(100);
  return inCard(CARD_ID);
}

describe('the booker’s room card with a companion out', () => {
  it('says who consented, who cannot come, and how many more the room needs', async () => {
    const shown = await cardWith(ONE_OUT);

    expect(shown.getByText('김민준님이 동의했어요')).toBeVisible();
    expect(shown.getByText('서지우님은 못 와요')).toBeVisible();
    expect(shown.getByText('1명 더 필요해요')).toBeVisible();
    expect(shown.getByText(/친구들의 동의를 기다리고 있어요 \(1\/1\)/u)).toBeVisible();
    expect(shown.getByRole('button', { name: '예약하기' })).toBeDisabled();
    expect(shown.getByRole('button', { name: ASK_ONE_MORE })).toBeEnabled();
  });
});

describe('one more Friend asked from the booker’s room card', () => {
  it('asks one more Friend through the picker and then shows them as asked', async () => {
    const shown = await cardWith(ONE_OUT);

    await pressIn(shown, ASK_ONE_MORE);

    expect(shown.getByRole('checkbox', { name: HA_EUN.name })).toBeVisible();
    expect(shown.getByRole('checkbox', { name: JI_WOO.name })).toBeVisible();
    expect(shown.queryByRole('checkbox', { name: MIN_JUN.name })).toBeNull();
    expect(shown.getByRole('button', { name: SEND_ONE_MORE })).toBeDisabled();

    server.on(`POST /library/room-requests/${REQUEST_ID}/companions`, { status: 201, body: ONE_MORE_ASKED });
    await pressIn(shown, HA_EUN.name, 'checkbox');
    await pressIn(shown, SEND_ONE_MORE);

    const sent = server.received(`POST /library/room-requests/${REQUEST_ID}/companions`);
    expect(sent.map(({ body }) => body)).toEqual([{ friendId: HA_EUN.friendId }]);
    expect(sent[0]?.idempotencyKey).toEqual(expect.any(String));
    const after = inCard(CARD_ID);
    expect(after.getByText('박하은님의 답을 기다리고 있어요')).toBeVisible();
    expect(after.queryByText('1명 더 필요해요')).toBeNull();
    expect(after.queryByRole('checkbox', { name: HA_EUN.name })).toBeNull();
    expectNoWrite(library);
  });

  it("shows the server's refusal and keeps the picker open", async () => {
    const shown = await cardWith(ONE_OUT);
    server.on(`POST /library/room-requests/${REQUEST_ID}/companions`, {
      status: 400,
      body: {
        statusCode: 400,
        error: 'Bad Request',
        code: 'ROOM_REQUEST_REFUSED',
        message: '친구가 아닌 사람이 있어요',
        refusals: [{ field: 'friendId', reason: '친구가 아닌 사람이 있어요' }],
      },
    });

    await pressIn(shown, ASK_ONE_MORE);
    await pressIn(shown, HA_EUN.name, 'checkbox');
    await pressIn(shown, SEND_ONE_MORE);

    const after = inCard(CARD_ID);
    expect(after.getByText('친구가 아닌 사람이 있어요')).toBeVisible();
    expect(after.getByRole('checkbox', { name: HA_EUN.name })).toBeVisible();
    expect(after.getByText('1명 더 필요해요')).toBeVisible();
  });
});

describe('the booker’s room card from a server without companions', () => {
  it('shows the request as before, with no companions and no one more to ask', async () => {
    const shown = await cardWith(requestOf('gathering'));

    expect(shown.getByText(/친구들의 동의를 기다리고 있어요 \(0\/2\)/u)).toBeVisible();
    expect(shown.queryByText(/님의 답을 기다리고 있어요/u)).toBeNull();
    expect(shown.queryByText(/더 필요해요/u)).toBeNull();
    expect(shown.queryByRole('button', { name: ASK_ONE_MORE })).toBeNull();
  });
});
