/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { reopenAnswer } from './support/questions';

// P02 ticket 35 against the fake main server: a reply that arrives while the answer frame is hidden puts a dot on the
// map screen's chip "이어서 · …" until the frame is shown (P04 ticket 11); "새 대화" keeps the conversation in the list
// of questions, with no toast to undo it (P04 ticket 10).

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

const REPLY = '셔틀 두 대가 정문과 자연대에 있어요.';
const NEXT_REPLY = '정문 셔틀이 먼저 와요.';
const FORGOTTEN = '대화를 지웠어요';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

function answerWith(text: string, afterMs = 500): void {
  server.on('POST /assistant/messages', {
    status: 200,
    body: { text, mapButtons: [], cards: [], proposal: null },
    afterMs,
  });
}

async function send(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

function pill(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-pill'));
}

function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

// Partitions: a reply that arrives while hidden; one that arrived before the frame was hidden.
describe('the chip "이어서" while the frame is hidden (P04 ticket 11)', () => {
  it('has a dot once a reply arrived meanwhile, and loses it when the frame is shown', async () => {
    answerWith(REPLY, 1000);
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    expect(screen.queryByTestId('continue-unseen')).toBeNull();

    await pass(1000);

    expect(screen.getByTestId('continue-unseen')).toBeVisible();
    expect(screen.getByRole('button', { name: '이어서, 셔틀 어디 있어?, 새 답 있음' })).toBeVisible();
    await reopenAnswer(user);
    expect(card().getByText(REPLY)).toBeVisible();
    await user.press(pill().getByRole('button', { name: '답 닫기' }));
    expect(screen.queryByTestId('continue-unseen')).toBeNull();
    expect(screen.getByRole('button', { name: '이어서, 셔틀 어디 있어?' })).toBeVisible();
  });

  it('has no dot for a reply seen before the frame was hidden', async () => {
    answerWith(REPLY);
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');
    await pass(500);

    await user.press(pill().getByRole('button', { name: '답 닫기' }));

    expect(screen.queryByTestId('continue-unseen')).toBeNull();
  });
});

// Asks twice; the main server answers each.
async function talkTwice(): Promise<User> {
  answerWith(REPLY);
  const user = await openMain();
  await send(user, '셔틀 어디 있어?');
  await pass(500);
  answerWith(NEXT_REPLY);
  await send(user, '정문 셔틀은?');
  await pass(500);
  return user;
}

function questions(): ReturnType<typeof within> {
  return within(screen.getByTestId('question-list'));
}

// Partitions: the conversation brought back from "지난 대화"; no toast; a new message after it (P04 ticket 10).
describe('"새 대화"', () => {
  it('keeps the conversation in the list of questions, which brings it back with the frame', async () => {
    const user = await talkTwice();

    await user.press(screen.getByRole('button', { name: '새 대화' }));
    expect(screen.queryByTestId('answer-card')).toBeNull();
    await user.press(screen.getByRole('button', { name: '지난 대화 1개' }));
    expect(questions().getAllByTestId('question-row')).toHaveLength(2);
    await user.press(questions().getByRole('button', { name: /정문 셔틀은\?/u }));

    expect(pill().getByText('정문 셔틀은?')).toBeVisible();
    expect(card().getByText(NEXT_REPLY)).toBeVisible();
  });

  it('erases nothing, so no toast offers 되돌리기', async () => {
    const user = await talkTwice();

    await user.press(screen.getByRole('button', { name: '새 대화' }));

    expect(screen.queryByText(FORGOTTEN)).toBeNull();
    expect(screen.queryByRole('button', { name: '되돌리기' })).toBeNull();
  });

  it('starts a conversation of its own with the next message, the earlier one still listed', async () => {
    const user = await talkTwice();
    await user.press(screen.getByRole('button', { name: '새 대화' }));
    answerWith('새 답이에요.');
    await send(user, '배고파');
    await pass(500);

    expect(pill().getByText('배고파')).toBeVisible();
    expect(within(screen.getByTestId('answer-pill-count')).getByText('1')).toBeVisible();
    await user.press(screen.getByTestId('answer-pill'));
    expect(questions().getAllByTestId('question-row')).toHaveLength(3);
  });
});
