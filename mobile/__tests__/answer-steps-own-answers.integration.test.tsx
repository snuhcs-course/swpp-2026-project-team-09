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

// Each step of several shows its own answer (P03 ticket 21), against the fake main server with the main server's own
// reply to "점심이랑 저녁 짜줘" (`several-answers.ts`), moved to the day after the phone's: choosing a step puts its answer
// in the time card, the plan last browsed in a step comes back with it, and a plan chosen in words chooses its step.

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
const DINNER_BAND = '17:00–18:00 · 식사 60분';

function twoMeals(): AssistantReply {
  const reply = severalAnswersReplyTo(WORDS, TOMORROW);
  if (reply === null) {
    throw new Error('No stored reply of lunch and dinner');
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

async function asked(reply: AssistantReply): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: reply, afterMs: 100 });
  const user = await openMain();
  await layStage(390, 760);
  await user.type(screen.getByLabelText(AI_INPUT), WORDS);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

async function choose(user: User, number: number): Promise<void> {
  await user.press(screen.getByRole('button', { name: new RegExp(`^${String(number)}번 `, 'u') }));
  await pass(300);
}

// The time card's words, which read the stretch of its answer's band.
const bandWords = (): ReturnType<typeof screen.getByTestId> =>
  within(screen.getByTestId('time-card-head')).getByTestId('time-band-words');

describe('The steps of lunch and dinner', () => {
  it('show lunch first, and each step its own answer in the time card', async () => {
    const user = await asked(twoMeals());
    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
    expect(bandWords()).not.toHaveTextContent(new RegExp(DINNER_BAND, 'u'));

    await choose(user, 2);

    expect(bandWords()).toHaveTextContent(new RegExp(DINNER_BAND, 'u'));
    expect(bandWords()).not.toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
    expect(screen.getByRole('button', { name: /^2번 /u })).toBeSelected();

    await choose(user, 1);

    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });

  it('bring back the plan last browsed in a step when it is chosen again', async () => {
    const user = await asked(twoMeals());
    await user.press(within(screen.getByTestId('plan-stepper')).getByLabelText('다음 후보'));
    await pass(300);
    expect(screen.getByTestId('plan-count')).toHaveTextContent('2/3');

    await choose(user, 2);
    expect(screen.getByTestId('plan-count')).toHaveTextContent('1/3');
    await choose(user, 1);

    expect(screen.getByTestId('plan-count')).toHaveTextContent('2/3');
    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });

  it('open at the step of a plan chosen in words', async () => {
    const reply = twoMeals();
    const dinner = reply.answers?.[1];
    await asked({ ...reply, select: { planId: dinner?.plans[0]?.id ?? '', key: dinner?.key } });

    expect(screen.getByRole('button', { name: /^2번 /u })).toBeSelected();
    expect(bandWords()).toHaveTextContent(new RegExp(DINNER_BAND, 'u'));
    expect(bandWords()).not.toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });
});
