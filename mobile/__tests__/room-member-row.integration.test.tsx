/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import {
  answer,
  answerMyParty,
  answerRoom,
  myPicnicParty,
  openRoom,
  PICNIC,
  PICNIC_PARTY,
  toast,
} from './support/room';
import { askMainServer, ME_ID, MIN_JUN, PHONE_NOW } from './support/server';

// The Leader's icons on another member's row, 파티장 넘기기 and 내보내기 beside 친구 추가, each asking first, and the
// count beside 멤버, against the fake main server. The User leads the Quest and its Party; 김민준 is a Friend and 이서연
// is not.

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

function members(): ReturnType<typeof within> {
  return within(screen.getByLabelText('멤버'));
}

describe("the Leader's icons", () => {
  it('are three in a line on the row of a member who is no Friend, with no words', async () => {
    await openRoom();

    for (const name of ['이서연님 친구 추가', '이서연님에게 파티장 넘기기', '이서연님 내보내기']) {
      expect(members().getByRole('button', { name })).toHaveTextContent(/^$/u);
    }
  });
});

describe('내보내기', () => {
  it('asks first, then takes the Holder out of the Quest and of the Party the User leads', async () => {
    answerMyParty(server, myPicnicParty(ME_ID));
    server.on(`DELETE ${QUEST}/holders/${MIN_JUN.id}`, { status: 204 });
    server.on(`DELETE /parties/mine/members/${MIN_JUN.id}`, { status: 204 });
    const user = await openRoom();

    await user.press(members().getByRole('button', { name: '김민준님 내보내기' }));
    expect(screen.getByRole('header', { name: '김민준님을 파티에서 내보낼까요?' })).toBeVisible();
    expect(server.received(`DELETE ${QUEST}/holders/${MIN_JUN.id}`)).toHaveLength(0);
    await answer(user, '내보내기');

    expect(server.received(`DELETE ${QUEST}/holders/${MIN_JUN.id}`)).toHaveLength(1);
    expect(server.received(`DELETE /parties/mine/members/${MIN_JUN.id}`)).toHaveLength(1);
    expect(toast()).toHaveTextContent('김민준님을 내보냈어요');
  });

  it('removes no one on 취소', async () => {
    const user = await openRoom();

    await user.press(members().getByRole('button', { name: '김민준님 내보내기' }));
    await answer(user, '취소');

    expect(screen.queryByRole('header', { name: '김민준님을 파티에서 내보낼까요?' })).toBeNull();
    expect(server.received(`DELETE ${QUEST}/holders/${MIN_JUN.id}`)).toHaveLength(0);
  });
});

describe('파티장 넘기기', () => {
  it('still asks first, then hands the role over', async () => {
    server.on(`PUT ${QUEST}/leader`, { status: 204 });
    const user = await openRoom();

    await user.press(members().getByRole('button', { name: '김민준님에게 파티장 넘기기' }));
    expect(screen.getByRole('header', { name: '김민준님에게 파티장을 넘길까요?' })).toBeVisible();
    await answer(user, '넘기기');

    expect(server.received(`PUT ${QUEST}/leader`).map(({ body }) => body)).toEqual([{ userId: MIN_JUN.id }]);
    expect(toast()).toHaveTextContent('김민준님이 파티장이 됐어요');
  });
});

describe('멤버 of a Closed Quest', () => {
  it('shows no count, and no lock line while the activation runs without the User', async () => {
    answerRoom(server, { ...PICNIC, joinPolicy: 'closed' });
    server.on('GET /parties', { status: 200, body: [PICNIC_PARTY] });

    await openRoom();

    expect(members().getByRole('header', { name: '멤버 3' })).toBeVisible();
    expect(members().queryByText('3/4명')).toBeNull();
    expect(screen.queryByText('활성화에 참여해야 멤버 위치를 볼 수 있어요')).toBeNull();
  });
});
