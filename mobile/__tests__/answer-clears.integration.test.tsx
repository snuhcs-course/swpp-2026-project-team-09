/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
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

// P05 ticket 55, against the fake main server: a reply that says it clears the answer on screen takes it off the map,
// with its time card and its button. On the user's phone (2026-11-26), "다다음주 월요일 점심" over tomorrow's lunch was
// refused in words while tomorrow's plan, its time card and 일정에 넣기 stayed under them. A reply of words alone that
// does not say so still keeps the answer (P04 ticket 46).

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

// Tomorrow's lunch for the User alone, whose main button is 일정에 넣기.
const LUNCH_ALONE = {
  text: '가장 덜 걷는 301동식당을 추천해요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: MEAL_ANSWER_ALONE,
};

const REFUSED = {
  text: '다다음주 월요일은 일주일보다 뒤라 계획할 수 없어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
};

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  server.on('POST /assistant/messages', { status: 200, body: LUNCH_ALONE, afterMs: 500 });
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

describe('A reply after a meal answer that could plan nothing', () => {
  it('takes the answer off the screen when it says it clears it', async () => {
    const user = await openMain();
    await ask(user, '내일 점심');
    expect(screen.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
    server.on('POST /assistant/messages', { status: 200, body: { ...REFUSED, clears: true }, afterMs: 500 });

    await ask(user, '다다음주 월요일 점심');

    expect(screen.getByText(REFUSED.text)).toBeVisible();
    expect(screen.queryByRole('button', { name: '일정에 넣기' })).toBeNull();
    await ask(user, '그럼 내일 저녁');
    expect(lastRequest()).toMatchObject({ context: { conditions: null, planId: null } });
  });

  it('keeps the answer under words alone that do not say so', async () => {
    const user = await openMain();
    await ask(user, '내일 점심');
    server.on('POST /assistant/messages', { status: 200, body: REFUSED, afterMs: 500 });

    await ask(user, '왜 302동은 없어?');

    expect(screen.getByRole('button', { name: '일정에 넣기' })).toBeVisible();
  });
});
