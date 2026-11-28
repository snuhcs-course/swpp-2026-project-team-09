/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, type userEvent, within } from '@testing-library/react-native';
import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
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

// The steps of one conversation stay in it (P03 ticket 22). On the user's phone (2026-11-28, the preview build): after
// "아침 7시에 도서관 갔다가 점심", "＋ 새 대화" and then "점심" alone drew the old conversation's steps card over the single
// lunch answer, with two flags for one Restaurant. Every way the conversation on screen ends or changes leaves no steps
// of another reply, on screen or in what the next request tells the main server.

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

const STEPS_WORDS = '아침 7시에 도서관 갔다가 점심';

function studyLunch(): AssistantReply {
  const reply = severalAnswersReplyTo(STEPS_WORDS, '2026-10-07');
  if (reply === null) {
    throw new Error('No stored reply of a study place and lunch');
  }
  return reply;
}

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

// The context the last request told the main server.
function lastContext(): unknown {
  const body: unknown = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

async function afterSteps(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await ask(user, STEPS_WORDS, studyLunch());
  expect(screen.getByRole('button', { name: /^2번 /u })).toBeVisible();
  return user;
}

// No steps on screen, and none told the main server.
function expectNoSteps(): void {
  expect(lastContext()).not.toHaveProperty('steps');
  expect(lastContext()).not.toHaveProperty('answers');
  expect(screen.queryByRole('button', { name: /^1번 /u })).toBeNull();
  expect(screen.queryByTestId('steps-top')).toBeNull();
}

async function pickFromList(user: User, words: string): Promise<void> {
  await user.press(screen.getByTestId('answer-caption'));
  await pass(300);
  const list = within(screen.getByTestId('question-list'));
  await user.press(list.getByRole('button', { name: new RegExp(words, 'u') }));
  await pass(500);
}

// Partitions: "＋ 새 대화"; ✕ and a question on the main map; an earlier conversation picked from the list; a single
// answer in the same conversation.
describe('A single answer after the steps of a study place and lunch', () => {
  it('in a new conversation tells the main server no steps, and draws no steps card', async () => {
    const user = await afterSteps();
    await user.press(screen.getByRole('button', { name: '새 대화' }));
    await pass(300);

    await ask(user, '점심', MEAL_ANSWER_REPLY);

    expectNoSteps();
  });

  it('asked on the main map after ✕ tells no steps, and draws no steps card', async () => {
    const user = await afterSteps();
    await user.press(screen.getByRole('button', { name: '답 닫기' }));
    await pass(300);

    await ask(user, '점심', MEAL_ANSWER_REPLY);

    expectNoSteps();
  });

  it('in an earlier conversation picked from the list tells no steps of the other one', async () => {
    const user = await afterSteps();
    await user.press(screen.getByRole('button', { name: '새 대화' }));
    await pass(300);
    await ask(user, '점심', MEAL_ANSWER_REPLY);
    await pickFromList(user, STEPS_WORDS);
    expect(screen.getByRole('button', { name: /^1번 /u })).toBeVisible();
    await pickFromList(user, '^[^,]*, 점심,');

    await ask(user, '고마워', MEAL_ANSWER_REPLY);

    expectNoSteps();
  });

  it('in the same conversation draws no steps card, and the next request tells none', async () => {
    const user = await afterSteps();
    await ask(user, '점심만 다시', MEAL_ANSWER_REPLY);
    expect(screen.queryByTestId('steps-top')).toBeNull();

    await ask(user, '고마워', MEAL_ANSWER_REPLY);

    expectNoSteps();
  });
});
