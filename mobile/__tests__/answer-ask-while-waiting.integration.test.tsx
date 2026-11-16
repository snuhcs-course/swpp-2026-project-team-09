/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { MEET_ANSWER } from '@/api/mock/data/meet-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { hideKeyboard, KEYBOARD, showKeyboard } from './support/keyboard';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { press } from './support/markers';
import { answerFriendsWithMinSu, meetFromCard, MIN_SU, row } from './support/meet';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P02 ticket 32 and the review of pull request 335, against the fake main server: a turn asked while the frame is
// hidden and a reply is still on its way takes that question back first, as 그만 does, so that the late reply answers
// nothing.

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

const OPENING = '안녕';
const OPENING_REPLY = '안녕하세요. 무엇을 도와드릴까요?';
const FIRST = '셔틀 어디 있어?';
const LATE = '셔틀 두 대가 정문과 자연대에 있어요.';
const EXAMPLE = '식사 메뉴 추천';
const SECOND_REPLY = '오늘 점심은 302동식당이 가까워요.';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerFriendsWithMinSu(server);
  server.on('POST /assistant/answers', { status: 200, body: MEET_ANSWER });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

// The main server's replies to the messages in turn, each after its wait; the last one answers every later message.
function answerInTurn(replies: readonly { text: string; afterMs: number }[]): void {
  let count = 0;
  server.on('POST /assistant/messages', () => {
    const { text, afterMs } = replies[Math.min(count, replies.length - 1)] ?? { text: '', afterMs: 0 };
    count += 1;
    return { status: 200, body: { text, mapButtons: [], cards: [], proposal: null }, afterMs };
  });
}

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

// Asks FIRST and hides the frame with ✕ while its reply is on its way.
async function askThenHide(user: User): Promise<void> {
  await send(user, FIRST);
  await user.press(pill().getByRole('button', { name: '답 닫기' }));
}

// Presses an example above the AI input, which the everyday map shows while the keyboard is up.
async function askExample(user: User): Promise<void> {
  await showKeyboard(KEYBOARD);
  await user.press(screen.getByRole('button', { name: EXAMPLE }));
  await hideKeyboard();
}

// The messages the last request sent.
function expectSent(messages: object[]): void {
  expect(server.received('POST /assistant/messages').at(-1)?.body).toEqual(expect.objectContaining({ messages }));
}

// Partitions: the new turn by an example (a message) and by a card's button (a recalculated turn). Expected values:
// the review's path, where the late reply answered the new turn and two User messages went out in a row.
describe('a turn asked while a hidden reply is on its way', () => {
  it('by an example: the late reply answers nothing, and the input waits for the new reply', async () => {
    answerInTurn([
      { text: LATE, afterMs: 2000 },
      { text: SECOND_REPLY, afterMs: 3000 },
    ]);
    const user = await openMain();
    await askThenHide(user);

    await askExample(user);
    await pass(2000);

    expect(pill().getByText(EXAMPLE)).toBeVisible();
    expect(screen.queryByText(LATE)).toBeNull();
    expect(screen.getByLabelText('보는 중')).toBeVisible();
    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    await pass(1500);
    expect(screen.getByText(SECOND_REPLY)).toBeVisible();
    await send(user, '고마워');
    expectSent([
      { role: 'user', text: EXAMPLE },
      { role: 'assistant', text: SECOND_REPLY, cards: [] },
      { role: 'user', text: '고마워' },
    ]);
  });

  it("by a card's button: the late reply does not replace the card's answer", async () => {
    answerInTurn([{ text: LATE, afterMs: 2000 }]);
    const user = await openMain();
    await askThenHide(user);

    await press(user, row(MIN_SU));
    await meetFromCard(user);
    await pass(2000);

    expect(pill().getByText(/만나고 싶다/u)).toBeVisible();
    expect(screen.queryByText(LATE)).toBeNull();
    expect(screen.queryByLabelText('보는 중')).toBeNull();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

// Partitions: 그만 on the turn that took the waiting question back, with a turn answered before both. Expected values:
// the review, where 그만 left the first question without its reply.
describe('그만 on that turn', () => {
  it('leaves the turn before, with no question left without its reply', async () => {
    answerInTurn([
      { text: OPENING_REPLY, afterMs: 0 },
      { text: LATE, afterMs: 2000 },
      { text: SECOND_REPLY, afterMs: 3000 },
    ]);
    const user = await openMain();
    await send(user, OPENING);
    await pass(500);
    await askThenHide(user);
    await askExample(user);

    await user.press(screen.getByRole('button', { name: '그만' }));
    await pass(3500);

    expect(pill().getByText(OPENING)).toBeVisible();
    expect(screen.getByText(OPENING_REPLY)).toBeVisible();
    expect(screen.queryByText(LATE)).toBeNull();
    expect(screen.queryByText(SECOND_REPLY)).toBeNull();
    await send(user, '고마워');
    expectSent([
      { role: 'user', text: OPENING },
      { role: 'assistant', text: OPENING_REPLY, cards: [] },
      { role: 'user', text: '고마워' },
    ]);
  });
});
