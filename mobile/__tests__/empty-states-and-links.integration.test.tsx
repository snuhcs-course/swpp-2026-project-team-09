/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { answerEvents, openEvents } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, toast } from './support/room';
import { answerParty, CODING, invitationTo, openAt, requestFor } from './support/party';
import { askMainServer, PHONE_NOW } from './support/server';

// What an empty 파티 tab, 행사 tab and 보낸 신청 say they are for, with their one first action (HE H7), and the toast
// after asking to join, which links to 보낸 신청 (HE H11). Against the fake main server (P06 ticket 07).

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the empty states', () => {
  it('내 파티 without a 파티 says what it holds and leads to 찾기', async () => {
    answerParty(server, { quests: [] });
    const user = await openAt('/party?tab=mine');

    expect(screen.getByText('여기서는 참여 중인 파티를 볼 수 있어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '파티 찾기' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: /^찾기/u })).toBeSelected();
  });

  it('보낸 신청 without a request says what it holds and leads to 찾기', async () => {
    answerParty(server, { invitations: [], requests: [] });
    const user = await openAt('/party?tab=invites');

    expect(screen.getByText('여기서는 보낸 참여 신청을 볼 수 있어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '파티 찾기' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: /^찾기/u })).toBeSelected();
  });

  it('행사 without an event says what it holds and leads to the 파티 tab', async () => {
    answerEvents(server, { events: [] });
    const user = await openEvents();

    expect(screen.getByText('여기서는 학교 행사를 모아 볼 수 있어요')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '파티 찾기' }));
    await pass(500);

    expect(shownAddress()).toBe('/party?tab=find');
  });
});

describe('the toast after asking to join', () => {
  it('links to 보낸 신청, where the request now shows', async () => {
    const setAnswers = answerParty(server);
    server.on('POST /quest-join-requests', { status: 201, body: invitationTo(CODING, 'qr1') });
    const user = await openAt('/party');

    await user.press(screen.getByLabelText(CODING.title));
    await user.press(within(screen.getByLabelText('파티 모집글')).getByRole('button', { name: '참여 신청' }));
    setAnswers({ requests: [requestFor(CODING)] });
    await answer(user, '참여 신청');
    expect(toast()).toHaveTextContent(/참여를 신청했어요/u);
    await user.press(within(toast()).getByRole('button', { name: '보낸 신청 보기' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
    expect(screen.getByText('보낸 신청 · 1')).toBeVisible();
    expect(screen.getByText(CODING.title)).toBeVisible();
  });
});
