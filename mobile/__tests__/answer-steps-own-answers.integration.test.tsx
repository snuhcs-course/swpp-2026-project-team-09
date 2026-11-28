/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, screen, type userEvent, within } from '@testing-library/react-native';
import type { AnswerReply, AssistantReply } from '@/api/assistant-types';
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
  await user.press(screen.getByTestId(`step-word-${String(number)}`));
  await pass(300);
}

// A plan browsed in the step's list, as a press on its row chooses it in a meal alone; the menu the press opens is
// closed again, back to the list (P03 ticket 25: a step lists its plans and has no pager).
async function browse(user: User, number: number): Promise<void> {
  await user.press(screen.getByTestId(`meal-row-${String(number)}`));
  await pass(300);
  await user.press(screen.getByTestId('meal-menu-back'));
  await pass(300);
}

const row = (number: number): ReturnType<typeof screen.getByTestId> => screen.getByTestId(`meal-row-${String(number)}`);

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
    expect(screen.getByTestId('step-word-2')).toBeSelected();

    await choose(user, 1);

    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });

  it('bring back the plan last browsed in a step when it is chosen again', async () => {
    const user = await asked(twoMeals());
    await browse(user, 2);
    expect(row(2)).toBeSelected();

    await choose(user, 2);
    expect(row(1)).toBeSelected();
    await choose(user, 1);

    expect(row(2)).toBeSelected();
    expect(bandWords()).toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });

  it('open at the step of a plan chosen in words', async () => {
    const reply = twoMeals();
    const dinner = reply.answers?.[1];
    await asked({ ...reply, select: { planId: dinner?.plans[0]?.id ?? '', key: dinner?.key } });

    expect(screen.getByTestId('step-word-2')).toBeSelected();
    expect(bandWords()).toHaveTextContent(new RegExp(DINNER_BAND, 'u'));
    expect(bandWords()).not.toHaveTextContent(new RegExp(LUNCH_BAND, 'u'));
  });
});

// TaeHyun79's review of #725: what is kept of a step gives way to the main server's newer answer, and moves with its key.
// The main server answers the words again, or a recalculation of dinner, as these tests set it.

async function askAgain(user: User, reply: AssistantReply): Promise<void> {
  server.on('POST /assistant/messages', { status: 200, body: reply, afterMs: 100 });
  await user.type(screen.getByLabelText(AI_INPUT), WORDS);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
}

function dinnerOf(reply: AssistantReply): AnswerReply {
  const dinner = reply.answers?.[1];
  if (dinner === undefined) {
    throw new Error('No dinner in the stored reply');
  }
  return dinner;
}

// Dinner recalculated from `start` to `end`, under `key`, as the main server answers a moved band.
function laterDinner(key: string | undefined, start = '17:30', end = '18:30'): AnswerReply {
  const dinner = dinnerOf(twoMeals());
  const [first] = dinner.plans;
  if (first === undefined) {
    throw new Error('No dinner plan');
  }
  const plan = { ...first, startAt: first.startAt.replace('17:00', start), endAt: first.endAt.replace('18:00', end) };
  return { ...dinner, key, plans: dinner.plans.with(0, plan) };
}

// A drag of dinner's end, which asks the main server to plan dinner again.
async function moveDinner(answer: AnswerReply): Promise<void> {
  server.on('POST /assistant/answers', { status: 200, body: answer });
  await fireEvent(screen.getByRole('adjustable', { name: '끝 시각' }), 'accessibilityAction', {
    nativeEvent: { actionName: 'increment' },
  });
  await pass(1000);
}

// Partitions: a later reply over a plan browsed; a later reply over a recalculation; a recalculation under a new key.
describe('A step of lunch and dinner kept on screen', () => {
  it('opens an answer a later reply gave again at its first plan, not at the plan browsed before', async () => {
    const user = await asked(twoMeals());
    await choose(user, 2);
    await browse(user, 2);
    expect(row(2)).toBeSelected();

    await askAgain(user, twoMeals());
    await choose(user, 2);

    expect(row(1)).toBeSelected();
  });

  it('draws a step at the answer a later reply gave again, not at its recalculation before', async () => {
    const user = await asked(twoMeals());
    await choose(user, 2);
    await moveDinner(laterDinner(dinnerOf(twoMeals()).key));
    expect(screen.getByRole('button', { name: /^저녁 17:30–18:30/u })).toBeOnTheScreen();
    await choose(user, 1);

    await askAgain(user, twoMeals());

    expect(screen.getByRole('button', { name: /^저녁 17:00–18:00/u })).toBeOnTheScreen();
  });

  it('stays on a step whose answer a recalculation gave another key', async () => {
    const user = await asked(twoMeals());
    await choose(user, 2);

    await moveDinner(laterDinner('meal 2026-10-07 dinner together'));

    expect(screen.getByRole('button', { name: /^저녁 17:30–18:30/u })).toBeSelected();
  });
});

// TaeHyun79's second review of #725: a key changed and changed back, as "＋ 같이" does to a study (a Friend added and
// taken out: `… alone` → `… together` → `… alone`) and the bar's other meal to a meal (lunch → dinner → lunch), driven
// here by the main server's recalculations of a moved band under those keys. Partitions: two changes back to the first
// key; three.
describe('A step whose answer changed key and changed back', () => {
  it('stays chosen at its last answer after a second change back to its first key', async () => {
    const user = await asked(twoMeals());
    const key = dinnerOf(twoMeals()).key ?? '';
    await choose(user, 2);

    await moveDinner(laterDinner(`${key} together`));
    await moveDinner(laterDinner(key, '18:00', '19:00'));

    expect(screen.getByRole('button', { name: /^저녁 18:00–19:00/u })).toBeSelected();
  });

  it('stays chosen at its last answer after three changes back to its first key', async () => {
    const user = await asked(twoMeals());
    const key = dinnerOf(twoMeals()).key ?? '';
    await choose(user, 2);

    await moveDinner(laterDinner('meal 2026-10-07 lunch'));
    await moveDinner(laterDinner('meal 2026-10-07 late', '17:45', '18:45'));
    await moveDinner(laterDinner(key, '18:00', '19:00'));

    expect(screen.getByRole('button', { name: /^저녁 18:00–19:00/u })).toBeSelected();
  });
});
