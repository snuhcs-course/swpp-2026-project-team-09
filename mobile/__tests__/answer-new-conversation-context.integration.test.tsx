/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 47, against the fake main server: the first message of a new conversation carries none of the answer
// before it, neither its conditions nor its Plan, although that answer is still kept until the next render; a
// follow-up typed on the answer still carries both. Before, a meal asked for tomorrow made the next question on the
// main map ("예술계 점심") plan tomorrow again.

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

const MEAL = '내일 점심, 민수랑 같이';
const FOLLOW_UP = '더 가까운 곳은?';
const NEW = '예술계 점심';

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  server.on('POST /assistant/messages', { status: 200, body: MEAL_ANSWER_REPLY, afterMs: 500 });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = Awaited<ReturnType<typeof openMain>>;

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

function lastRequest(): unknown {
  return server.received('POST /assistant/messages').at(-1)?.body;
}

// A first message of its own conversation, with nothing of the answer before it.
const FRESH = {
  messages: [{ role: 'user', text: NEW }],
  context: { conditions: null, planId: null, tapped: null },
};

// Partitions: a follow-up on the answer; a new conversation from the main map after "←".
describe("the context of a conversation's first message", () => {
  it('carries the conditions and the Plan on screen for a follow-up typed on the answer', async () => {
    const user = await openMain();
    await ask(user, MEAL);

    await ask(user, FOLLOW_UP);

    expect(lastRequest()).toMatchObject({
      context: { conditions: MEAL_ANSWER_REPLY.answer.input, planId: expect.any(String) as unknown },
    });
  });

  it('carries no conditions, Plan, or tap of the answer before when typed on the main map after ✕', async () => {
    const user = await openMain();
    await ask(user, MEAL);
    await user.press(screen.getByRole('button', { name: '답 닫기' }));

    await ask(user, NEW);

    expect(lastRequest()).toMatchObject(FRESH);
  });
});
