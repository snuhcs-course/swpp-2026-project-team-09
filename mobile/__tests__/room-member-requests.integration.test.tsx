/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerRoom, HIS_PICNIC, openRoom, PICNIC, SEO_YEON_HOLDER, toast } from './support/room';
import { askMainServer, JOIN_REQUESTS, PHONE_NOW } from './support/server';

// The room's 친구 추가 on another member's row, and the Leader's mark on a request from a User the Leader removed,
// against the fake main server. 김민준 is a Friend of the User and 이서연 is not.

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

const QUEST = `/quests/${PICNIC.id}`;
const SEO_YEON = SEO_YEON_HOLDER;
const SENT_AT = '2026-10-06T03:00:00.000Z';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function section(name: string): ReturnType<typeof within> {
  return within(screen.getByLabelText(name));
}

function answerFriendRequests(body: object): void {
  server.on('GET /friend-requests', { status: 200, body: { received: [], sent: [], ...body } });
}

describe('친구 추가 on 멤버', () => {
  it('is on the row of a member who is no Friend only, and sends a Friend Request by user id', async () => {
    server.on('POST /friend-requests', { status: 201, body: { status: 'waiting' } });
    const user = await openRoom();

    expect(section('멤버').queryByRole('button', { name: '김민준님 친구 추가' })).toBeNull();
    expect(section('멤버').queryByRole('button', { name: '홍길동님 친구 추가' })).toBeNull();
    await user.press(section('멤버').getByRole('button', { name: '이서연님 친구 추가' }));
    await pass(500);

    expect(server.received('POST /friend-requests').map(({ body }) => body)).toEqual([{ userId: SEO_YEON.id }]);
    expect(toast()).toHaveTextContent('이서연님에게 친구 요청을 보냈어요');
  });

  it('is 요청됨, not pressable, once the User sent a request', async () => {
    answerFriendRequests({ sent: [{ id: 'fr8', receiver: SEO_YEON, sentAt: SENT_AT }] });

    await openRoom();

    expect(section('멤버').getByRole('button', { name: '이서연님에게 친구 요청됨' })).toBeDisabled();
    expect(section('멤버').queryByRole('button', { name: '이서연님 친구 추가' })).toBeNull();
  });

  it('is 수락 when the member sent one, which accepts it', async () => {
    answerFriendRequests({ received: [{ id: 'fr7', sender: SEO_YEON, sentAt: SENT_AT }] });
    server.on('POST /friend-requests/fr7/accept', { status: 204 });
    const user = await openRoom();

    await user.press(section('멤버').getByRole('button', { name: '이서연님의 친구 요청 수락' }));
    await pass(500);

    expect(server.received('POST /friend-requests/fr7/accept')).toHaveLength(1);
    expect(toast()).toHaveTextContent('이서연님과 친구가 됐어요');
  });

  it('is on the rows a Holder who does not lead sees too', async () => {
    answerRoom(server, HIS_PICNIC);

    await openRoom(HIS_PICNIC);

    expect(section('멤버').getByRole('button', { name: '이서연님 친구 추가' })).toBeVisible();
  });
});

describe('신청 of an Open Quest', () => {
  it('lists the requests from Users the Leader removed, each marked 전에 내보낸 멤버', async () => {
    const [removed, other] = JOIN_REQUESTS;
    server.on(`GET ${QUEST}/join-requests`, {
      status: 200,
      body: [
        { ...removed, removedBefore: true },
        { ...other, removedBefore: false },
      ],
    });

    await openRoom(PICNIC);

    expect(section('참여 신청').getByRole('header', { name: '신청 2' })).toBeVisible();
    expect(section('참여 신청').getAllByText('전에 내보낸 멤버')).toHaveLength(1);
  });
});
