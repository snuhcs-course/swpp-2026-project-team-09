/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { color, space } from '@/design-system';
import { ANSWER_TOP, listsTop } from '@/screens/main/layout';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// From the user's phone (P04 ticket 52): "←" is never inside the time bar but the round button under it, the bar's
// words starting at its left edge; the docked card shows the handle and takes a drag, down closing the answer and up
// raising the card; a drag down on the card takes the list of questions away first, as back does.

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

const HANDLE = '답 크게 보기';
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

// Partitions: an answer with a time bar laid out.
describe('"←" with a time bar', () => {
  it('is the round button directly under the bar, at the map’s left margin, and the bar’s words start at its edge', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);

    await lay('time-bar', BAR);

    // The tests' status bar takes nothing.
    expect(screen.getByTestId('answer-back')).toHaveStyle({
      top: listsTop(0) + BAR + space[2],
      left: ANSWER_TOP.side,
      width: ANSWER_TOP.height,
      backgroundColor: color.surface,
    });
    const words: unknown = screen.getByTestId('time-band-words').props.style;
    expect(StyleSheet.flatten<TextStyle>(Array.isArray(words) ? words : [words]).paddingLeft ?? 0).toBe(0);
  });
});

// Partitions: a drag down past half the docked card; a short one; a drag up.
describe('the docked card', () => {
  it('shows the handle, and a drag down past half the card closes the answer and keeps the conversation', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    expect(within(screen.getByTestId('answer-card')).getByRole('button', { name: HANDLE })).toBeCollapsed();
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
    expect(screen.getByRole('button', { name: HANDLE })).toBeCollapsed();
    expect(screen.queryByTestId('answer-close-hint')).toBeNull();
  });

  it('is raised by a drag up', async () => {
    await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    await lay('answer-card', CARD);

    await drag('answer-dock-drag', -80);

    expect(screen.getByRole('button', { name: HANDLE })).toBeExpanded();
  });
});

// Partitions: the list of questions open on the lowered card.
describe('a drag down with the list of questions open', () => {
  it('takes the list away and leaves the answer, as back does', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_MENUS_REPLY);
    // The open card's handle takes a drag once the stage is laid out, as it always is on a phone.
    await layStage(390, 760);
    await user.press(screen.getByTestId('answer-caption'));
    expect(screen.getByTestId('question-list')).toBeVisible();
    await lay('answer-card-content', 200);
    await lay('answer-card', 300);

    await drag('answer-card-handle', 400);

    expect(screen.queryByTestId('question-list')).toBeNull();
    expect(screen.getByTestId('answer-caption')).toBeVisible();
  });
});
