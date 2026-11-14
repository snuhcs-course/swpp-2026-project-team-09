/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { MEAL_ANSWER, MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE, MEAL_ANSWER_FIXED_START, MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { askOnMap, card, FIRST_PLAN_MARKS, mapThings } from './support/answer-map';
import { step } from './support/answer-correct';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ME, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// Words typed in the card (P02 ticket 03, "Words"): the request context holds the conditions and the Plan on screen,
// and the reply's answer replaces the one on screen. Over the stored answer to "배고파, 민수랑 같이", whose third Plan
// is 학생회관식당, and the stored answers for the User alone, for three, and with a fixed start.

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

const WORDS = '지은이도 불러 줘';
const HELD_MS = 3000;
const PLAIN_REPLY = { text: '알겠어요.', mapButtons: [], cards: [], proposal: null };

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

type User = Awaited<ReturnType<typeof askOnMap>>;

async function say(user: User, words: string = WORDS): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
}

function lastContext(): unknown {
  const body = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

// Partitions: the third Plan of the answer the reply drew; the Plan after a recalculation.
describe('words sent with an answer on screen', () => {
  it('carry its conditions and the id of the Plan on screen', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '다음 후보' }));
    await user.press(card().getByRole('button', { name: '다음 후보' }));

    await say(user);
    await pass(500);

    expect(lastContext()).toEqual(
      expect.objectContaining({ location: ON_CAMPUS, conditions: MEAL_ANSWER.input, planId: '학생회관식당' }),
    );
  });

  it('carry the recalculated conditions after a recalculation', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_ALONE });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await user.press(card().getByRole('button', { name: '민수 빼기' }));
    await pass(500);

    await say(user);
    await pass(500);

    expect(lastContext()).toEqual(
      expect.objectContaining({ conditions: MEAL_ANSWER_ALONE.input, planId: '301동식당' }),
    );
  });
});

// Partitions: the follow-up waiting; its reply with an answer, after a drag; its reply without one.
describe('the answer on screen after words', () => {
  it("keeps the Plan's marks on the map while the follow-up waits", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    server.on('POST /assistant/messages', { status: 200, body: PLAIN_REPLY, afterMs: HELD_MS });

    await say(user);
    await pass(500);

    expect(mapThings()).toEqual(expect.arrayContaining(FIRST_PLAN_MARKS));
  });

  it("is the reply's answer, which drops the outline of a drag", async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_ANSWER_FIXED_START });
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await step('from', 'increment');
    expect(screen.getByTestId('time-band-ghost')).toBeOnTheScreen();
    server.on('POST /assistant/messages', { status: 200, body: { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_THREE } });

    await say(user);
    await pass(500);

    expect(card().getByText('12:33 학생회관식당')).toBeVisible();
    expect(screen.queryByTestId('time-band-ghost')).toBeNull();
  });

  it('brings the everyday map back for a reply without an answer', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    server.on('POST /assistant/messages', { status: 200, body: PLAIN_REPLY });

    await say(user);
    await pass(500);

    expect(mapThings().filter((name) => FIRST_PLAN_MARKS.includes(name))).toEqual([]);
    expect(mapThings()).toContain(ME);
  });
});
