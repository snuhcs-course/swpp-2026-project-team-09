/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { KeptNotification } from '@/api/types';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { answerMadeQuest, KEPT_MADE, MADE_ACCEPTED, signInAsAsker } from './support/made-quest';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { ACCEPTED, answerMainScreen, askMainServer, INVITATION, PHONE_NOW } from './support/server';

// The bar's two counts (A04 ticket 12), against the fake main server: 오늘 counts what the User must do, and the
// middle what the AI has ready while it is lowered or another tab is in front. They never count the same thing.

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

const UNREAD: KeptNotification = { ...ACCEPTED, read: false };
const SHUTTLE = '셔틀 언제 와?';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  server.on('GET /notifications', { status: 200, body: [] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function middle(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('tab', { name: /^지도/u });
}

// Asks once on the map and closes the answer, so that "이어서 · …" is kept.
async function askAndClose(user: User): Promise<void> {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text: '셔틀이 곧 와요.', mapButtons: [], cards: [], proposal: null },
    afterMs: 500,
  });
  await user.type(screen.getByLabelText(AI_INPUT), SHUTTLE);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '답 닫기' }));
}

describe("오늘's count", () => {
  it('is the rows that wait and the unread Notifications, said as 답할 것, and 파티 has none', async () => {
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });
    server.on('GET /notifications', { status: 200, body: [UNREAD] });
    await openMain();

    expect(screen.getByRole('tab', { name: '오늘, 답할 것 2개' })).toBeVisible();
    expect(screen.getByRole('tab', { name: '파티' })).toBeVisible();
  });
});

describe("the middle's count", () => {
  beforeEach(async () => {
    await signInAsAsker();
    answerMadeQuest(server);
  });

  it('counts the conversation to go on with and a made Quest that waits, only while the AI is lowered', async () => {
    const user = await openMain(KEPT_MADE);
    await askAndClose(user);

    expect(middle()).toHaveProp('accessibilityLabel', '지도');
    expect(screen.queryByTestId('bottom-nav-round-count')).toBeNull();

    await user.press(middle());

    expect(middle()).toHaveProp('accessibilityLabel', '지도, AI가 준비한 것 2개');
    expect(screen.getByTestId('bottom-nav-round-count')).toHaveTextContent('2');
  });

  it('counts on another tab too', async () => {
    const user = await openMain(KEPT_MADE);

    await user.press(screen.getByRole('tab', { name: '행사' }));

    expect(middle()).toHaveProp('accessibilityLabel', '지도, AI가 준비한 것 1개');
  });

  it('shows nothing at zero', async () => {
    const user = await openMain();

    await user.press(screen.getByRole('tab', { name: '행사' }));

    expect(middle()).toHaveProp('accessibilityLabel', '지도');
    expect(screen.queryByTestId('bottom-nav-round-count')).toBeNull();
  });

  it('leaves out a made Quest once its Friend accepted, whose Notification counts in 오늘', async () => {
    answerMadeQuest(server, MADE_ACCEPTED);
    server.on('GET /notifications', { status: 200, body: [UNREAD] });
    const user = await openMain(KEPT_MADE);

    await user.press(screen.getByRole('tab', { name: '행사' }));

    expect(middle()).toHaveProp('accessibilityLabel', '지도');
    expect(screen.getByRole('tab', { name: '오늘, 답할 것 1개' })).toBeVisible();
  });
});
