/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { type FakeServer, refusal } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen, shownAddress } from './support/app';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answer, ME_HOLDER, toast } from './support/room';
import { answerParty, CODING, JAZZ, openAt, requestFor } from './support/party';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// 보낸 신청 under 초대, against the fake main server, on Tuesday 6 October 2026 at 13:00 in Korea: the User's waiting
// requests to join, each opening its post and withdrawn with 신청 취소.

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

// Two waiting requests, the newest first: to 김민준's Approval Quest, and to 이서연's Quest asked as an Approval one.
const TO_CODING = requestFor(CODING, 'qr1');
const TO_JAZZ = { ...requestFor({ ...JAZZ, joinPolicy: 'approval' }, 'qr2'), sentAt: '2026-10-06T02:00:00.000Z' };

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { requests: [TO_CODING, TO_JAZZ] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function row(requestId: string): ReturnType<typeof within> {
  return within(screen.getByTestId(`sent-request-${requestId}`));
}

describe('보낸 신청', () => {
  it("lists every waiting request beside the invitations received, each with its post's title", async () => {
    await openAt('/party?tab=invites');

    expect(screen.getByText('받은 초대 · 0')).toBeVisible();
    expect(screen.getByText('보낸 신청 · 2')).toBeVisible();
    expect(row('qr1').getByText(CODING.title)).toBeVisible();
    expect(row('qr1').getByText('김민준 · 5분 전 신청')).toBeVisible();
    expect(row('qr2').getByText(JAZZ.title)).toBeVisible();
    expect(screen.getAllByTestId(/^sent-request-/u)).toEqual([
      screen.getByTestId('sent-request-qr1'),
      screen.getByTestId('sent-request-qr2'),
    ]);
  });

  it('opens the post when a row is pressed', async () => {
    const user = await openAt('/party?tab=invites');

    await user.press(row('qr1').getByRole('button', { name: CODING.title }));
    await pass(500);

    expect(shownAddress()).toBe(`/post/${CODING.id}`);
    expect(screen.getByText('참여 신청을 기다리는 중이에요')).toBeVisible();
  });

  it('withdraws once the User confirms, says so, and drops the row', async () => {
    server.on('POST /quest-join-requests/qr1/withdraw', () => {
      setAnswers({ requests: [TO_JAZZ] });
      return { status: 204 };
    });
    const user = await openAt('/party?tab=invites');

    await user.press(row('qr1').getByRole('button', { name: '신청 취소' }));
    await pass(500);
    expect(screen.getByText(`‘${CODING.title}’ 참여 신청을 취소할까요?`)).toBeVisible();
    await answer(user, '취소');
    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(0);
    expect(row('qr1').getByText(CODING.title)).toBeVisible();

    await user.press(row('qr1').getByRole('button', { name: '신청 취소' }));
    await pass(500);
    await answer(user, '신청 취소');

    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(toast()).toHaveTextContent('신청을 취소했어요');
    expect(screen.queryByTestId('sent-request-qr1')).toBeNull();
    expect(screen.getByText('보낸 신청 · 1')).toBeVisible();
  });
});

describe('a withdrawal pressed twice', () => {
  it('sends one, and drops the row before the list comes again', async () => {
    const user = await openAt('/party?tab=invites');
    server.on('POST /quest-join-requests/qr1/withdraw', { status: 204, afterMs: 3000 });
    server.on('GET /quest-join-requests', { status: 200, body: [TO_JAZZ], afterMs: 10_000 });

    await user.press(row('qr1').getByRole('button', { name: '신청 취소' }));
    await pass(100);
    await answer(user, '신청 취소');
    await user.press(row('qr1').getByRole('button', { name: '신청 취소' }));
    await pass(100);
    await answer(user, '신청 취소');
    await pass(3000);

    expect(server.received('POST /quest-join-requests/qr1/withdraw')).toHaveLength(1);
    expect(toast()).toHaveTextContent('신청을 취소했어요');
    expect(screen.queryByTestId('sent-request-qr1')).toBeNull();
  });
});

describe('a withdrawal the Leader answered first', () => {
  const holding = { ...DINNER, id: CODING.id, title: CODING.title, holders: [ME_HOLDER] };

  it.each([
    ['accepted, so the User now holds the Quest', [DINNER, holding], '이미 파티에 들어갔어요'],
    ['declined, so the User does not hold it', [DINNER], '파티장이 신청을 받지 않았어요'],
  ])('reads the Quests again and says the Leader %s', async (_answered, quests, words) => {
    server.on('POST /quest-join-requests/qr1/withdraw', () => {
      setAnswers({ requests: [TO_JAZZ], quests });
      return refusal(404, 'QUEST_JOIN_REQUEST_NOT_FOUND');
    });
    const user = await openAt('/party?tab=invites');
    const asked = server.received('GET /quests').length;

    await user.press(row('qr1').getByRole('button', { name: '신청 취소' }));
    await pass(500);
    await answer(user, '신청 취소');

    expect(server.received('GET /quests').length).toBeGreaterThan(asked);
    expect(toast()).toHaveTextContent(words);
    expect(screen.queryByTestId('sent-request-qr1')).toBeNull();
  });
});

describe('a request sent from a 파티 card in the answer frame', () => {
  it('appears in 보낸 신청 without more', async () => {
    setAnswers({ requests: [] });
    server.on('POST /assistant/messages', {
      status: 200,
      body: { text: '파티예요.', mapButtons: [], cards: [{ kind: 'quest', quest: CODING }], proposal: null },
    });
    server.on('POST /quest-join-requests', () => {
      setAnswers({ requests: [TO_CODING] });
      return { status: 201, body: TO_CODING };
    });
    const user = await openAt('/main');
    await user.type(screen.getByLabelText(AI_INPUT), '파티 찾기');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);
    const questCard = within(within(screen.getByTestId('answer-card')).getByLabelText(CODING.title));
    await user.press(questCard.getByRole('button', { name: '참여 신청' }));
    await pass(500);
    await answer(user, '참여 신청');

    await act(() => {
      router.navigate('/party?tab=invites');
    });
    await pass(500);

    expect(screen.getByText('보낸 신청 · 1')).toBeVisible();
    expect(row('qr1').getByText(CODING.title)).toBeVisible();
  });
});
