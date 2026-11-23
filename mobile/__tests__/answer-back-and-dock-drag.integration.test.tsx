/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet, TextInput, type TextStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap, card, timeBar } from './support/answer-map';
import { pass } from './support/app';
import { grip, gripLabel, HIDDEN, lowerCard, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { AI_INPUT, layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// From the user's phone (P04 ticket 52): the answer has no "←"; it closes by ✕ at the right end of the sheet's header
// row, a drag down, and Android's back, and "＋ 새 대화" stands just left of ✕ in every state. The grip's small label
// says what a drag up brings while the sheet shows the answer itself; nothing is pressed to raise or lower the card.
// The bar's words start at its left edge. The docked card takes a drag, down closing the answer and up raising the
// card; a drag down on the card takes the list of questions away first, as back does.

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

async function drag(gesture: string, dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId(gesture), [
      { translationX: 0, translationY: 0, velocityY: 0 },
      { translationX: 0, translationY: dy / 2, velocityY: 0 },
      { translationX: 0, translationY: dy, velocityY: 0 },
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

// Partitions: the sheet showing the answer docked, raised, and with the earlier questions or the list of Friends to add
// open; an answer with nothing to raise to is not a case here (`answer-dock-and-head`).
describe("the sheet's header", () => {
  it('holds the grip, its label with "⌃", the history chip, "＋ 새 대화", and ✕ on the docked card', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(gripLabel()).toMatch(/^\d+곳 목록$/u);
    expect(screen.getByTestId('answer-grip-up', HIDDEN)).toBeOnTheScreen();
    expect(grip()).toHaveAccessibleName(/^답 카드 높이, \d+곳 목록$/u);
    for (const name of [/이전 질문 보기$/u, ASK_NEW, CLOSE]) {
      expect(card().getByRole('button', { name })).toBeVisible();
    }
    expect(card().queryByText(/올리면/u)).toBeNull();
  });

  it('keeps the label without "⌃" on the raised card, and the same buttons', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await lay('answer-card', CARD);

    await drag('answer-dock-drag', -80);

    expect(grip()).toBeExpanded();
    expect(gripLabel()).toMatch(/^\d+곳 목록$/u);
    expect(screen.queryByTestId('answer-grip-up', HIDDEN)).toBeNull();
    expect(card().getByRole('button', { name: ASK_NEW })).toBeVisible();
    expect(card().getByRole('button', { name: CLOSE })).toBeVisible();
    expect(card().queryByText('내리기')).toBeNull();
  });

  it('has no label while the earlier questions are open, and keeps "＋ 새 대화" and ✕', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(screen.getByTestId('answer-caption'));

    expect(screen.getByTestId('question-list')).toBeVisible();
    expect(gripLabel()).toBeNull();
    expect(card().getByRole('button', { name: ASK_NEW })).toBeVisible();
    expect(card().getByRole('button', { name: CLOSE })).toBeVisible();
  });

  it('has no label while the list of Friends to add is open', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    expect(gripLabel()).toMatch(/^\d+곳 목록$/u);

    await user.press(timeBar().getByRole('button', { name: '같이 먹을 친구 추가' }));

    expect(gripLabel()).toBeNull();
    expect(card().getByRole('button', { name: CLOSE })).toBeVisible();
  });
});

// Partitions: a drag down past half the docked card; a short one; a drag up.
describe('the docked card', () => {
  it('shows the grip, and a drag down past half the card closes the answer and keeps the conversation', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    expect(grip()).toBeCollapsed();
    await lay('answer-card', CARD);

    await drag('answer-dock-drag', CARD);

    expect(screen.queryByTestId('answer-card')).toBeNull();
    expect(screen.getByRole('button', { name: KEPT })).toBeVisible();
  });

  it('stays after a short drag down', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await lay('answer-card', CARD);

    await drag('answer-dock-drag', 30);

    expect(screen.getByTestId('answer-caption')).toBeVisible();
    expect(grip()).toBeCollapsed();
    expect(screen.queryByTestId('answer-close-hint')).toBeNull();
  });

  it('is raised by a drag up, and a screen reader steps it down by the grip', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await lay('answer-card', CARD);

    await drag('answer-dock-drag', -80);
    expect(grip()).toBeExpanded();

    await lowerCard();
    expect(grip()).toBeCollapsed();
  });

  it('is not raised by a press on the grip or on its label', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await user.press(grip());
    await user.press(screen.getByTestId('answer-grip-label', HIDDEN));

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

// Partitions: docked with nothing over the answer; full; lowered with the earlier questions open. The steps follow
// back's order, and only those that can act are offered (PR 516's review).
describe("the grip's steps for a screen reader", () => {
  it('offers up and close on the docked card, and no step down', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    expect(steps()).toEqual(['increment', 'close']);
  });

  it('offers down and close on the full card, and no step up', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await raiseCard();
    await raiseCard();

    expect(grip()).toHaveAccessibilityValue({ text: '전체' });
    expect(steps()).toEqual(['decrement', 'close']);
  });

  it('takes the earlier questions away by a step down on the lowered card, as back does, and keeps the answer', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await user.press(screen.getByTestId('answer-caption'));
    expect(steps()).toEqual(['increment', 'decrement', 'close']);

    await lowerCard();

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('answer-caption')).toBeVisible();
    expect(steps()).toEqual(['increment', 'close']);
  });
});

// Partitions: the list of questions open on the lowered card.
describe('a drag down with the list of questions open', () => {
  it('takes the list away and leaves the answer, as back does', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    // The open card's header takes a drag once the stage is laid out, as it always is on a phone.
    await layStage(390, 760);
    await user.press(screen.getByTestId('answer-caption'));
    expect(screen.getByTestId('question-list')).toBeVisible();
    // The grip's label has nothing to say about the questions, and the input gives the list its room.
    expect(gripLabel()).toBeNull();
    expect(screen.queryByLabelText('AI에게 메시지')).toBeNull();
    await lay('answer-card-content', 200);
    await lay('answer-card', 300);

    await drag('answer-card-handle', 400);

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('answer-caption')).toBeVisible();
  });
});
