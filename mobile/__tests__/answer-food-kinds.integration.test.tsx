/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_MENUS, MEAL_ANSWER_MENUS_REPLY, MEAL_DINNER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import { raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap, timeBar } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The kinds of food as chips over the raised card's list (board E3) and lunch and dinner on the bar (P04 ticket 16,
// boards 24 to 26; the other meal's link went with P04 ticket 82): a press filters on the phone with no turn to the model,
// a candidate without the kind recedes to a grey name tag, the pick moves to the first candidate that serves it, and
// the kind on screen goes with the next message; a reply that carries a kind shows its chip filled.

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

const KOREAN = '한식 4곳';
const JAPANESE = '일식 2곳';

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

function selected(name: string): boolean | undefined {
  const state: unknown = screen.getByRole('button', { name }).props.accessibilityState;
  return typeof state === 'object' && state !== null && 'selected' in state ? Boolean(state.selected) : undefined;
}

function lastContext(): unknown {
  const body = server.received('POST /assistant/messages').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'context' in body ? body.context : undefined;
}

// Partitions: the chips at first; a kind the pick serves pressed, then pressed again; a kind it does not serve.
describe('the kind chips of a meal answer', () => {
  it('stand over the raised list in the order of their counts after 전체, only 전체 filled, without a label', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await raiseCard();

    expect(screen.queryByText('종류')).toBeNull();
    const chips = within(screen.getByTestId('kind-chips')).getAllByRole('button');
    expect(chips.map((chip) => String(chip.props.accessibilityLabel)).slice(1)).toEqual([
      KOREAN,
      JAPANESE,
      '양식 2곳',
      '중식 1곳',
    ]);
    expect(String(chips[0]?.props.accessibilityLabel)).toMatch(/^전체 \d+곳$/u);
    for (const name of [KOREAN, JAPANESE, '양식 2곳', '중식 1곳']) {
      expect(selected(name)).toBe(false);
    }
  });
});

// Partitions: a kind the pick serves pressed, then pressed again; a kind it does not serve; a grey tag pressed.
describe('a kind chip pressed', () => {
  it('fill on a press, recede a candidate without the kind, put the kind first in each line, and clear again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raiseCard();

    await user.press(screen.getByRole('button', { name: KOREAN }));

    expect(selected(KOREAN)).toBe(true);
    expect(screen.getByRole('button', { name: '자하연식당 2층' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '후보 2 · 301동식당 · 걸음 15분' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /^302동식당 · 12:15 · 걸음 20분 · 뼈없는감자탕 외 5 · /u }),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: KOREAN }));

    expect(selected(KOREAN)).toBe(false);
    expect(screen.getByRole('button', { name: /^후보 5 · 자하연식당 2층 · /u })).toBeOnTheScreen();
  });

  it('move the pick to the first candidate that serves a kind the pick does not', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raiseCard();

    await user.press(screen.getByRole('button', { name: JAPANESE }));

    expect(screen.getByRole('button', { name: /^3식당 · .*돈까스카레 외 2 · /u })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '302동식당' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^후보 5 · 자하연식당 2층 · /u })).toBeOnTheScreen();
  });

  it('clear when a grey tag is pressed, which becomes the pick', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raiseCard();
    await user.press(screen.getByRole('button', { name: KOREAN }));

    await user.press(screen.getByRole('button', { name: '자하연식당 2층' }));

    expect(selected(KOREAN)).toBe(false);
    expect(screen.getByRole('button', { name: /^자하연식당 2층 · /u })).toBeOnTheScreen();
  });
});

// Partitions: a message after a press; a reply whose conditions carry a kind.
describe('the kind on screen and the conversation', () => {
  it('goes with the next message as the condition cuisine', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raiseCard();
    await user.press(screen.getByRole('button', { name: KOREAN }));

    await user.type(screen.getByLabelText(AI_INPUT), '더 싼 데');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(lastContext()).toEqual(
      expect.objectContaining({ conditions: { ...MEAL_ANSWER_MENUS.input, cuisine: '한식' } }),
    );
  });

  it('fills the chip of a reply that carries a kind', async () => {
    const answer = { ...MEAL_ANSWER_MENUS, input: { ...MEAL_ANSWER_MENUS.input, cuisine: '한식' as const } };
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });
    await raiseCard();

    expect(selected(KOREAN)).toBe(true);
    expect(screen.getByRole('button', { name: '자하연식당 2층' })).toBeOnTheScreen();
  });
});

// The stored answer of lunch asked the day before, with the kind 한식 on screen.
function askedTheDayBefore(): typeof MEAL_ANSWER_MENUS {
  const plans = MEAL_ANSWER_MENUS.plans.map((plan) => ({
    ...plan,
    band: { ...plan.band, now: '2026-11-16T11:50:00+09:00' },
  }));
  return { ...MEAL_ANSWER_MENUS, plans, input: { ...MEAL_ANSWER_MENUS.input, cuisine: '한식' } };
}

// Partitions: lunch on a later day, whose main server still sends dinner as the other meal; dinner, which sends lunch
// (P04 ticket 82: the other meal is asked for in words, and the bar's ends say its times).
describe('lunch and dinner on the bar', () => {
  it('names the meal with its day', async () => {
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer: askedTheDayBefore() });

    expect(screen.getByTestId('time-band-words')).toHaveTextContent(/^내일\(화\) 점심 /u);
  });

  it.each([
    ['lunch', { ...askedTheDayBefore(), otherMeal: { meal: 'dinner', start: '17:00' } }, /저녁 17:00/u],
    ['dinner', { ...MEAL_DINNER_MENUS, otherMeal: { meal: 'lunch', start: '12:16' } }, /점심 12:16/u],
  ])('leave out the other meal under a %s answer', async (_, answer, other) => {
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });

    expect(timeBar().queryByText(other)).toBeNull();
    expect(screen.queryByTestId('meal-tick')).toBeNull();
  });
});

// Partitions: the kind chips while "만들고 초대 보내기" is on its way (review of PR 440).
describe('the kinds while the Plan is sent', () => {
  it('take no press, and change nothing on screen', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    // No kind chip takes a press: the docked row gives way to the card while the Plan is sent.
    expect(screen.queryByRole('button', { name: JAPANESE, disabled: false })).toBeNull();
    await pass(3000);

    expect(screen.getByRole('button', { name: /^302동식당 · 12:15 · /u })).toBeOnTheScreen();
    expect(server.received('POST /assistant/answers')).toHaveLength(0);
  });
});
