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

// "아침 7시에 도서관 갔다가 점심" on the app that says `answers` (P03 ticket 22), against the fake main server with the
// main server's own reply (`several-answers.ts`, from P05 ticket 76's `assistant-study-then-meal`), moved to the day
// after the phone's: ① a study place from 07:00 and ② lunch from it, each step with its own answer in the time card,
// the plan browsed in a step kept when the other is chosen, and a follow-up that tells the main server both.

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

const WORDS = '아침 7시에 도서관 갔다가 점심';
const TOMORROW = '2026-10-07';
const STUDY_BAND = '07:00–10:00 · 3시간';
const LUNCH_BAND = '11:00–12:00 · 식사 60분';

function studyLunch(): AssistantReply {
  const reply = severalAnswersReplyTo(WORDS, TOMORROW);
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

async function asked(): Promise<User> {
  const user = await openMain();
  await layStage(390, 760);
  await ask(user, WORDS, studyLunch());
  return user;
}

async function choose(user: User, number: number): Promise<void> {
  await user.press(screen.getByRole('button', { name: new RegExp(`^${String(number)}번 `, 'u') }));
  await pass(300);
}

// The time card's words, which read the stretch of its answer's band.
const bandWords = (): ReturnType<typeof screen.getByTestId> =>
  within(screen.getByTestId('time-card-head')).getByTestId('time-band-words');

describe('The steps of a study place and lunch', () => {
  it('open at the study from 07:00, and each step shows its own answer in the time card', async () => {
    const user = await asked();
    expect(screen.getByRole('button', { name: /^1번 /u })).toBeSelected();
    expect(bandWords()).toHaveTextContent(new RegExp(STUDY_BAND, 'u'));

    await choose(user, 2);

    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
    expect(bandWords()).not.toHaveTextContent(new RegExp(STUDY_BAND, 'u'));

    await choose(user, 1);

    expect(bandWords()).toHaveTextContent(new RegExp(STUDY_BAND, 'u'));
  });

  it("keep lunch's plan browsed while the study is chosen", async () => {
    const user = await asked();
    await choose(user, 2);
    await user.press(within(screen.getByTestId('plan-stepper')).getByLabelText('다음 후보'));
    await pass(300);
    expect(screen.getByTestId('plan-count')).toHaveTextContent('2/3');

    await choose(user, 1);
    await choose(user, 2);

    expect(screen.getByTestId('plan-count')).toHaveTextContent('2/3');
  });

  it('tell a follow-up both answers in the order of the steps, and the steps whole', async () => {
    const user = await asked();
    const reply = studyLunch();

    await ask(user, '점심은 12시로', reply);

    const sent = server.received('POST /assistant/messages').at(-1)?.body;
    expect(sent).toMatchObject({
      clientCapabilities: expect.arrayContaining(['answers']) as unknown,
      context: {
        answers: [{ kind: 'study' }, { kind: 'meal', meal: 'lunch' }],
        steps: reply.steps?.map(({ shows }) => ({ shows })),
      },
    });
  });
});
