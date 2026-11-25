/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card } from './support/answer-map';
import { pass } from './support/app';
import { FLING_SPEED } from '@/screens/main/answer/card-levels';
import { grip, lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// From the user's phone (P04 tickets 52 and 61): the answer has no "←"; it closes by ✕ at the right end of the sheet's
// header row, a drag down from low, and Android's back, and "＋ 새 대화" stands just left of ✕ in every state. No words
// stand under the grip, and nothing is pressed to raise or lower the card. The bar's words start at its left edge. The
// card takes a drag anywhere: from low, down past half of it or a fling closes the answer, and a fling up raises it a
// step. A drag only changes the card's height or closes the answer (P04 ticket 63): the list of questions and a
// restaurant's menu stay, and the header is the same over both.

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

const CLOSE = '답 닫기';
const ASK_NEW = '새 대화';
const NEW = '예술계 점심';
// The conversation kept on the main screen once the answer is closed.
const KEPT = /^이어서, 배고파, 민수랑 같이/u;
const BAR = 96;
const CARD = 140;
const FLING = FLING_SPEED * 2;

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

async function lay(testId: string, height: number): Promise<void> {
  await fireEvent(screen.getByTestId(testId), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

async function drag(gesture: string, dy: number, velocityY = 0): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(gesture), [
      { translationX: 0, translationY: 0, velocityY: 0 },
      { translationX: 0, translationY: dy / 2, velocityY },
      { translationX: 0, translationY: dy, velocityY },
    ]);
  });
}

// Partitions: the docked card of an answer with a time bar; ✕ and "＋ 새 대화" pressed there, and a message after it.
describe('the way out of the answer', () => {
  it('is ✕ at the right end of the card’s top row, no "←", and the bar’s words start at its edge', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await lay('time-bar', BAR);

    expect(screen.queryByTestId('answer-back')).toBeNull();
    expect(screen.queryByRole('button', { name: '뒤로' })).toBeNull();
    expect(within(screen.getByTestId('answer-card')).getByRole('button', { name: CLOSE })).toBeVisible();
    const words: unknown = screen.getByTestId('time-band-words').props.style;
    expect(StyleSheet.flatten<TextStyle>(Array.isArray(words) ? words : [words]).paddingLeft ?? 0).toBe(0);
  });

  it('closes the answer by ✕ and keeps the conversation', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(screen.getByRole('button', { name: CLOSE }));

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.getByRole('button', { name: KEPT })).toBeVisible();
  });

  it('starts a new conversation in one press of "＋ 새 대화", the cursor in the main map’s input', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    const focus = jest.spyOn(TextInput.prototype, 'focus');

    await user.press(card().getByRole('button', { name: ASK_NEW }));
    await pass(100);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.getByRole('button', { name: KEPT })).toBeVisible();
    expect(focus).toHaveBeenCalled();
  });

  it('sends the message typed after "＋ 새 대화" as the first of its own conversation, with nothing of the answer', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await user.press(card().getByRole('button', { name: ASK_NEW }));

    await user.type(screen.getByLabelText(AI_INPUT), NEW);
    await user.press(screen.getByRole('button', { name: '보내기' }));
    await pass(500);

    expect(server.received('POST /assistant/messages').at(-1)?.body).toMatchObject({
      messages: [{ role: 'user', text: NEW }],
      context: { conditions: null, planId: null, tapped: null },
    });
  });
});

// Partitions: the sheet showing the answer low, raised, and with the earlier questions or the list of Friends to add
// open; an answer with nothing to raise to is not a case here (`answer-dock-and-head`).
describe("the sheet's header", () => {
  it('holds the grip with no words under it, the history chip, "＋ 새 대화", and ✕ on the low card', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(grip()).toHaveAccessibleName('답 카드 높이');
    expect(within(grip()).queryByText(/./u)).toBeNull();
    expect(screen.queryByText(/곳 목록/u)).toBeNull();
    for (const name of [/이전 질문 보기$/u, ASK_NEW, CLOSE]) {
      expect(card().getByRole('button', { name })).toBeVisible();
    }
  });

  it('keeps the same buttons on the raised card', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await layStage(390, 760);

    await drag('answer-card-drag', -80, -FLING);

    expect(grip()).toBeExpanded();
    expect(card().getByRole('button', { name: ASK_NEW })).toBeVisible();
    expect(card().getByRole('button', { name: CLOSE })).toBeVisible();
    expect(card().queryByText('내리기')).toBeNull();
  });

  it('keeps "＋ 새 대화" and ✕ while the earlier questions are open', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(screen.getByTestId('answer-caption'));

    expect(screen.getByTestId('question-list')).toBeVisible();
    expect(card().getByRole('button', { name: ASK_NEW })).toBeVisible();
    expect(card().getByRole('button', { name: CLOSE })).toBeVisible();
  });
});

// Partitions: a drag down from low past half the card, a short one, and a fling down; a fling up.
describe('the low card', () => {
  it('shows the grip, and a drag down past half the card closes the answer and keeps the conversation', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    expect(grip()).toBeCollapsed();
    await lay('answer-card', CARD);

    await drag('answer-card-drag', CARD);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.getByRole('button', { name: KEPT })).toBeVisible();
  });

  it('stays after a short drag down', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await lay('answer-card', CARD);

    await drag('answer-card-drag', 20);

    expect(screen.getByTestId('answer-caption')).toBeVisible();
    expect(grip()).toBeCollapsed();
    expect(screen.queryByTestId('answer-close-hint')).toBeNull();
  });

  it('closes on a fling down once the stage is laid out', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await layStage(390, 760);

    await drag('answer-card-drag', 20, FLING);

    expect(screen.queryByTestId('answer-card')).toBeNull();
  });

  it('is raised a step by a fling up, and a screen reader steps it down by the grip', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await layStage(390, 760);

    await drag('answer-card-drag', -30, -FLING);
    expect(grip()).toBeExpanded();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });

    await lowerCard();
    expect(grip()).toBeCollapsed();
  });
});

// Partitions: a press on the grip.
describe('the grip', () => {
  it('raises nothing at a press', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(grip());

    expect(grip()).toBeCollapsed();
  });
});

// The user's phone test: the history chip, "＋ 새 대화", and ✕ are one height.
describe("the header row's shapes", () => {
  it('draws the history chip, "＋ 새 대화", and ✕ one height, ✕\'s 36', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    for (const id of ['answer-caption', 'answer-ask-new', 'answer-close']) {
      expect(screen.getByTestId(id)).toHaveStyle({ height: 36 });
    }
  });
});

// The steps a screen reader is offered on the grip, by name.
function steps(): unknown[] {
  const offered: unknown = grip().props.accessibilityActions;
  return Array.isArray(offered) ? offered.map((step: { name: string }) => step.name) : [];
}

// Partitions: low with nothing over the answer; high; low with the earlier questions open. Only the steps that can act
// are offered (PR 516's review).
describe("the grip's steps for a screen reader", () => {
  it('offers up and close on the low card, and no step down', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(steps()).toEqual(['increment', 'close']);
  });

  it('offers down and close on the high card, and no step up', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await raiseCard();
    await raiseCard();

    expect(grip()).toHaveAccessibilityValue({ text: '크게' });
    expect(steps()).toEqual(['decrement', 'close']);
  });

  it('offers no step down on the low card with the earlier questions open, and the list stays', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await user.press(screen.getByTestId('answer-caption'));

    expect(steps()).toEqual(['increment', 'close']);
    expect(screen.getByTestId('question-list')).toBeVisible();
  });
});

// Partitions: the list of questions and a restaurant's menu over the answer; a drag up, a drag down to low, and one
// past the close point from low (P04 ticket 63, boards k1 to k3).
describe('a drag with a layer over the answer', () => {
  it('raises and lowers the card with the list of questions open, and the list stays', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await layStage(390, 760);
    await user.press(screen.getByTestId('answer-caption'));
    expect(grip()).toBeCollapsed();

    await drag('answer-card-drag', -30, -FLING);
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
    await drag('answer-card-drag', 30, FLING);

    expect(grip()).toBeCollapsed();
    expect(screen.getByTestId('question-list')).toBeVisible();
  });

  it('closes the answer from low past the close point with the list of questions open', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await user.press(screen.getByTestId('answer-caption'));
    await lay('answer-card', CARD);

    await drag('answer-card-drag', CARD);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.getByRole('button', { name: KEPT })).toBeVisible();
  });

  it("keeps a restaurant's menu and the history chip through a drag down, and closes from low", async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await layStage(390, 760);
    await raiseCard();
    await user.press(screen.getByTestId('meal-row-2'));
    expect(screen.getByTestId('meal-menu')).toBeVisible();
    expect(card().getByRole('button', { name: /이전 질문 보기$/u })).toBeVisible();

    await drag('answer-card-drag', 30, FLING);
    expect(grip()).toBeCollapsed();
    expect(screen.getByTestId('meal-menu')).toBeOnTheScreen();

    await drag('answer-card-drag', 20, FLING);
    expect(screen.queryByTestId('answer-card')).toBeNull();
  });
});
