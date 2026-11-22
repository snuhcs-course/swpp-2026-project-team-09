/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { MEAL_ANSWER_MENUS, MEAL_ANSWER_MENUS_REPLY, MEAL_DINNER_MENUS } from '@/api/mock/data/meal-answer-menus';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass } from './support/app';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { AI_INPUT } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The kinds of food as chips over the raised card's list (board E3) and lunch and dinner on the bar (P04 ticket 16,
// boards 24 to 26): a press filters on the phone with no turn to the model,
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

type User = Awaited<ReturnType<typeof askOnMap>>;

// The card raised to the list by its sentence, where the kinds stand.
async function raise(user: User): Promise<void> {
  await user.press(screen.getByTestId('dock-line'));
}

// Partitions: the chips at first; a kind the pick serves pressed, then pressed again; a kind it does not serve.
describe('the kind chips of a meal answer', () => {
  it('stand over the raised list in the order of their counts after 전체, only 전체 filled, without a label', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    expect(screen.queryByRole('button', { name: KOREAN })).toBeNull();
    expect(screen.queryByRole('button', { name: '메뉴 보기' })).toBeNull();

    await raise(user);

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
    await raise(user);

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
    await raise(user);

    await user.press(screen.getByRole('button', { name: JAPANESE }));

    expect(screen.getByRole('button', { name: /^3식당 · .*돈까스카레 외 2 · /u })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '302동식당' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^후보 5 · 자하연식당 2층 · /u })).toBeOnTheScreen();
  });

  it('clear when a grey tag is pressed, which becomes the pick', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await raise(user);
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
    await raise(user);
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
    const user = await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });
    await raise(user);

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

function lastRecalculation(): unknown {
  const body = server.received('POST /assistant/answers').at(-1)?.body;
  return typeof body === 'object' && body !== null && 'input' in body ? body.input : undefined;
}

// Partitions: lunch on a later day with dinner after it; the tick pressed; dinner with lunch before it.
describe('lunch and dinner on the bar', () => {
  it('names the meal with its day, and the other meal stands at its end', async () => {
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer: askedTheDayBefore() });

    expect(screen.getByTestId('time-band-words')).toHaveTextContent(/^내일\(화\) 점심 /u);
    expect(screen.getByRole('button', { name: '저녁 17:00' })).toHaveTextContent('저녁 17:00 ›');
  });

  it('asks for dinner without the kind on a press, and shows lunch before it', async () => {
    server.on('POST /assistant/answers', { status: 200, body: MEAL_DINNER_MENUS });
    const user = await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer: askedTheDayBefore() });

    await user.press(screen.getByRole('button', { name: '저녁 17:00' }));
    await pass(500);

    expect(lastRecalculation()).toEqual({
      ...MEAL_ANSWER_MENUS.input,
      meal: 'dinner',
      window: { from: null, until: null },
      placeId: null,
      people: MEAL_ANSWER_MENUS.input.people.map(({ userId }) => ({ userId, constraints: [] })),
    });
    expect(screen.getByRole('button', { name: '점심 12:16' })).toHaveTextContent('‹ 점심 12:16');
    expect(screen.getByTestId('time-band-words')).toHaveTextContent(/^저녁 /u);
  });
});

// Partitions: the kind chips and the bar's tick pressed while "만들고 초대 보내기" is on its way (review of PR 440).
describe('the kinds and the other meal while the Plan is sent', () => {
  it('change nothing on screen, and ask for nothing', async () => {
    server.on('POST /plans', { status: 201, body: PLAN_QUEST, afterMs: 3000 });
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(within(screen.getByTestId('ai-input-beside')).getByRole('button', { name: '만들고 초대 보내기' }));
    // No kind chip takes a press: the docked row gives way to the card while the Plan is sent.
    expect(screen.queryByRole('button', { name: JAPANESE, disabled: false })).toBeNull();
    const dinner = screen.getByRole('button', { name: '저녁 17:00' });
    expect(dinner).toBeDisabled();
    await user.press(dinner);
    await pass(3000);

    expect(screen.getByRole('button', { name: /^302동식당 · 12:15 · /u })).toBeOnTheScreen();
    expect(server.received('POST /assistant/answers')).toHaveLength(0);
  });
});
