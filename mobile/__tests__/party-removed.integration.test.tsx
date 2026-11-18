/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerParty, openAt, requestFor, RUN } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// A User the Leader removed from 최유나's Open Quest, against the fake main server: they come back only by asking,
// with one caption that says why.

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

const CAPTION = '내보내진 파티라 파티장 승인이 필요해요';
const REMOVAL = { questId: RUN.id, removedAt: '2026-10-06T03:45:00.000Z' };

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { removals: [REMOVAL] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('파티 모집글 of an Open Quest the Leader removed the User from', () => {
  it('shows 참여 신청 with the caption, in place of 참여하기', async () => {
    await openAt(`/post/${RUN.id}`);

    expect(screen.getByRole('button', { name: '참여 신청' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '참여하기' })).toBeNull();
    expect(screen.getByText(CAPTION)).toBeVisible();
  });

  it('asks the Leader, and does not join', async () => {
    server.on('POST /quest-join-requests', { status: 201, body: requestFor(RUN) });
    const user = await openAt(`/post/${RUN.id}`);

    await user.press(screen.getByRole('button', { name: '참여 신청' }));
    await answer(user, '참여 신청');

    expect(server.received('POST /quest-join-requests')[0]?.body).toEqual({ questId: RUN.id });
    expect(server.received(`POST /quests/${RUN.id}/join`)).toEqual([]);
    expect(toast()).toHaveTextContent('참여를 신청했어요보낸 신청 보기');
  });
});

describe('파티 모집글 of an Open Quest without a removal', () => {
  it('shows 참여하기 without the caption', async () => {
    setAnswers({ removals: [] });

    await openAt(`/post/${RUN.id}`);

    expect(screen.getByRole('button', { name: '참여하기' })).toBeVisible();
    expect(screen.queryByText(CAPTION)).toBeNull();
  });
});

describe('보낸 신청', () => {
  it('shows the caption on the request to the Quest the Leader removed the User from only', async () => {
    const asked = requestFor({ ...RUN, title: '다른 파티', id: '9a7e0c1d-0000-4f00-8000-0000000c0099' }, 'qr2');
    setAnswers({ requests: [requestFor(RUN, 'qr1'), asked] });

    await openAt('/party?tab=invites');

    expect(within(screen.getByTestId('sent-request-qr1')).getByText(CAPTION)).toBeVisible();
    expect(within(screen.getByTestId('sent-request-qr2')).queryByText(CAPTION)).toBeNull();
  });
});
