/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, type userEvent, within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { severalAnswersReplyTo } from '@/api/mock/data/several-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { answerDining } from './support/dining';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// A reply that ends a request with none over lunch and dinner as steps (P03 ticket 22, P05 ticket 79), against the fake
// main server: it draws nothing of its own and names what leaves in `withdrawn`. With one step left the main server
// sends no steps again, so the app takes dinner's step off and lunch stays. With none left it says `clears`, and the
// steps leave with their answers.

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

const WORDS = '점심이랑 저녁 짜줘';
const TOMORROW = '2026-10-07';
const LUNCH_BAND = '11:00–12:00 · 식사 60분';

function twoMeals(): AssistantReply {
  const reply = severalAnswersReplyTo(WORDS, TOMORROW);
  if (reply === null) {
    throw new Error('No stored reply of lunch and dinner');
  }
  return reply;
}

const [LUNCH_KEY, DINNER_KEY] = (twoMeals().answers ?? []).map(({ key }) => key ?? '');

// The main server's reply of words alone to a request that ended with none.
const ended = (withdrawn: string[], clears?: true): AssistantReply => ({
  text: '다다음주 월요일은 일주일보다 뒤라 계획할 수 없어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  answers: [],
  withdrawn,
  lookup: null,
  refusal: null,
  ...(clears === undefined ? {} : { clears }),
});

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  answerDining(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

type User = ReturnType<typeof userEvent.setup>;

async function ask(user: User, words: string, reply: AssistantReply): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: reply, afterMs: 100 });
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

async function asked(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await ask(user, WORDS, twoMeals());
  await user.press(screen.getByRole('button', { name: /^2번 /u }));
  await pass(300);
  return user;
}

const bandWords = (): ReturnType<typeof screen.getByTestId> =>
  within(screen.getByTestId('time-card-head')).getByTestId('time-band-words');

// Partitions: one step left, the step chosen withdrawn; none left. Then the next request.
describe('A reply that withdrew a step of lunch and dinner', () => {
  it("takes dinner's step off and leaves lunch on screen, chosen", async () => {
    const user = await asked();

    await ask(user, '저녁은 다다음주 월요일로', ended([DINNER_KEY]));

    expect(screen.getByText(/계획할 수 없어요/u)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^2번 /u })).toBeNull();
    expect(screen.getByRole('button', { name: /^1번 /u })).toBeSelected();
    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });

  it('tells the next request lunch alone among the steps', async () => {
    const user = await asked();
    await ask(user, '저녁은 다다음주 월요일로', ended([DINNER_KEY]));

    await ask(user, '점심은 12시로', ended([]));

    const sent = server.received('POST /assistant/messages').at(-1)?.body;
    expect(sent).toMatchObject({ context: { answers: [{ meal: 'lunch' }] } });
    expect(sent).toHaveProperty('context.steps', [
      expect.objectContaining({ shows: { kind: 'answer', key: LUNCH_KEY } }),
    ]);
  });

  it('takes both steps off with their answers once nothing stays', async () => {
    const user = await asked();

    await ask(user, '우리 학교 밖 맛집', ended([LUNCH_KEY, DINNER_KEY], true));

    expect(screen.queryByRole('button', { name: /^1번 /u })).toBeNull();
    expect(screen.queryByTestId('time-card-head')).toBeNull();
  });
});
