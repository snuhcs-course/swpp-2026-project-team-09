/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react-native';
import { MEAL_ANSWER_MENUS, MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
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

// The kinds of food as chips (P04 ticket 16, boards 24 and 25): a press filters on the phone with no turn to the model,
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
  it('stand with "종류" in the order of their counts, none filled', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(screen.getByText('종류')).toBeVisible();
    for (const name of [KOREAN, JAPANESE, '양식 2곳', '중식 1곳']) {
      expect(selected(name)).toBe(false);
    }
    expect(screen.getByRole('button', { name: '메뉴 모두 보기' })).toBeOnTheScreen();
  });

  it('fill on a press, recede a candidate without the kind, put the kind first in each line, and clear again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(screen.getByRole('button', { name: KOREAN }));

    expect(selected(KOREAN)).toBe(true);
    expect(screen.getByRole('button', { name: '자하연식당 2층' })).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: '후보 2 · 301동식당 · 12:18 · 뚝배기불고기 외 4 · 5,000원부터' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^302동식당 · 12:15 점심 · 뼈없는감자탕 외 5$/u })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: KOREAN }));

    expect(selected(KOREAN)).toBe(false);
    expect(screen.getByRole('button', { name: /^후보 5 · 자하연식당 2층 · /u })).toBeOnTheScreen();
  });

  it('move the pick to the first candidate that serves a kind the pick does not', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(screen.getByRole('button', { name: JAPANESE }));

    expect(screen.getByRole('button', { name: /^3식당 · .*돈까스카레 외 2$/u })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '302동식당' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^후보 5 · 자하연식당 2층 · /u })).toBeOnTheScreen();
  });

  it('clear when a grey tag is pressed, which becomes the pick', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
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
    await user.press(screen.getByRole('button', { name: KOREAN }));

    await user.type(screen.getByLabelText(AI_INPUT), '더 싼 데');
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(lastContext()).toEqual(
      expect.objectContaining({ conditions: expect.objectContaining({ kind: 'meal', cuisine: '한식' }) }),
    );
  });

  it('fills the chip of a reply that carries a kind', async () => {
    const answer = { ...MEAL_ANSWER_MENUS, input: { ...MEAL_ANSWER_MENUS.input, cuisine: '한식' as const } };
    await askOnMap(server, { ...MEAL_ANSWER_MENUS_REPLY, answer });

    expect(selected(KOREAN)).toBe(true);
    expect(screen.getByRole('button', { name: '자하연식당 2층' })).toBeOnTheScreen();
  });
});
