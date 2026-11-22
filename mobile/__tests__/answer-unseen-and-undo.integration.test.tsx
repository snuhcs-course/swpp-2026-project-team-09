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
// map screen's chip "이어서 · …" until the frame is shown (P04 ticket 11); a question typed on the main map starts a
// conversation of its own and keeps the old one in the caption's list of questions, with no toast to undo it (rule 4
// of the 2026-11-22 redesign).

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

function caption(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-caption'));
}

async function closeAnswer(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: '뒤로' }));
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
    await closeAnswer(user);
    expect(screen.queryByTestId('continue-unseen')).toBeNull();

    await pass(1000);

    expect(screen.getByTestId('continue-unseen')).toBeVisible();
    expect(screen.getByRole('button', { name: '이어서, 셔틀 어디 있어?, 새 답 있음' })).toBeVisible();
    await reopenAnswer(user);
    expect(card().getByText(REPLY)).toBeVisible();
    await closeAnswer(user);
    expect(screen.queryByTestId('continue-unseen')).toBeNull();
    expect(screen.getByRole('button', { name: '이어서, 셔틀 어디 있어?' })).toBeVisible();
  });

  it('has no dot for a reply seen before the frame was hidden', async () => {
    answerWith(REPLY);
    const user = await openMain();
    await send(user, '셔틀 어디 있어?');
    await pass(500);

    await closeAnswer(user);

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

// The conversation of two questions closed with "←", then a question typed on the main map.
async function askOnMap(user: User): Promise<void> {
  await closeAnswer(user);
  answerWith('새 답이에요.');
  await send(user, '배고파');
  await pass(500);
}

// Partitions: the earlier conversation brought back from the new one's list; no toast (rule 4 of the 2026-11-22
// redesign).
describe('a question typed on the main map while a conversation is kept', () => {
  it("starts a conversation of its own, whose caption's list brings the earlier one back with its reply", async () => {
    const user = await talkTwice();

    await askOnMap(user);

    expect(caption().getByText('배고파')).toBeVisible();
    await user.press(screen.getByTestId('answer-caption'));
    expect(questions().getAllByTestId('question-row')).toHaveLength(3);
    await user.press(questions().getByRole('button', { name: /정문 셔틀은\?/u }));
    expect(caption().getByText('정문 셔틀은?')).toBeVisible();
    expect(card().getByText(NEXT_REPLY)).toBeVisible();
  });

  it('erases nothing, so no toast offers 되돌리기', async () => {
    const user = await talkTwice();

    await askOnMap(user);

    expect(screen.queryByText(FORGOTTEN)).toBeNull();
    expect(screen.queryByRole('button', { name: '되돌리기' })).toBeNull();
  });
});
