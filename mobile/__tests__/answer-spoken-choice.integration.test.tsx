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

// The meal answer of a main server that takes planIds says so (`choosable`).
const CHOOSABLE = { ...MEAL_ANSWER_REPLY, answer: { ...MEAL_ANSWER_REPLY.answer, choosable: true } };
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
  server.on('POST /assistant/messages', { status: 200, body: CHOOSABLE, afterMs: 500 });
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

  // TaeHyun79's review of PR 596: a dish picked from the menus plans again and chooses in one reply. The new answer
  // opens at the plan chosen, not at its first.
  it("opens the reply's own new answer at the plan it chose", async () => {
    const user = await openMain();
    await ask(user, '점심 뭐 먹지');
    const reordered = [...CHOOSABLE.answer.plans].reverse();
    const [, chosen] = reordered;
    const answer = { ...CHOOSABLE.answer, plans: reordered };
    const body = { ...CHOOSABLE, text: `${chosen?.id ?? ''}으로 골랐어요.`, answer, select: { planId: chosen?.id } };
    server.on('POST /assistant/messages', { status: 200, body, afterMs: 500 });
    await ask(user, '돈까스 먹고 싶어');

    await ask(user, '좋아');

    expect(lastRequest()).toMatchObject({
      context: { planId: chosen?.id, planIds: reordered.map(({ id }) => id) },
    });
  });
});

// TaeHyun79's review of PR 596: a main server before ticket 51 refuses a request whose context has planIds, as its
// schema is strict. Over its meal answer, which does not say `choosable`, the app sends none, and every follow-up is
// answered.
describe('A follow-up to a main server before ticket 51', () => {
  it('sends no planIds and is answered', async () => {
    server.on('POST /assistant/messages', ({ body }) => {
      const context = (body as { context?: Record<string, unknown> }).context ?? {};
      return 'planIds' in context
        ? { status: 400, body: { statusCode: 400, message: 'Unrecognized key: "planIds"' } }
        : { status: 200, body: MEAL_ANSWER_REPLY, afterMs: 500 };
    });
    const user = await openMain();
    await ask(user, '점심 뭐 먹지');

    await ask(user, '2번으로 할게');

    expect(lastRequest()).toMatchObject({ context: { conditions: MEAL_ANSWER_REPLY.answer.input } });
    expect(lastRequest()).not.toHaveProperty('context.planIds');
    expect(screen.queryByText(/답을 가져오지 못했어요/u)).toBeNull();
  });
});
