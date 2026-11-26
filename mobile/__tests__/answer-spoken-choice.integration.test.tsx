/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
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

// P05 ticket 51, against the fake main server: a plan of the meal answer on screen chosen in words. On the user's
// phone (2026-11-26), "2번으로 할게" over six places was planned again at that place alone, a new answer numbered 1.
// Now the request sends the plans the app numbers, and a reply that chose one draws nothing of its own: the answer,
// its list and its numbers stay, and the plan chosen is the one on screen.

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

const PLAN_IDS = MEAL_ANSWER_REPLY.answer.plans.map(({ id }) => id);
const [FIRST = '', , THIRD = ''] = PLAN_IDS;

const CHOSEN = {
  text: `3번 ${THIRD}으로 골랐어요.`,
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
  select: { planId: THIRD },
};

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

describe('A plan of the meal answer chosen in words', () => {
  it('is asked with the plans the app numbers, in their order', async () => {
    const user = await openMain();
    await ask(user, '점심 뭐 먹지');
    server.on('POST /assistant/messages', { status: 200, body: CHOSEN, afterMs: 500 });

    await ask(user, '3번으로 할게');

    expect(lastRequest()).toMatchObject({ context: { planId: FIRST, planIds: PLAN_IDS } });
  });

  it('becomes the plan on screen, with the answer and its plans kept', async () => {
    const user = await openMain();
    await ask(user, '점심 뭐 먹지');
    server.on('POST /assistant/messages', { status: 200, body: CHOSEN, afterMs: 500 });
    await ask(user, '3번으로 할게');

    await ask(user, '좋아');

    expect(screen.getByText(CHOSEN.text)).toBeVisible();
    expect(lastRequest()).toMatchObject({
      context: { conditions: MEAL_ANSWER_REPLY.answer.input, planId: THIRD, planIds: PLAN_IDS },
    });
  });
});
