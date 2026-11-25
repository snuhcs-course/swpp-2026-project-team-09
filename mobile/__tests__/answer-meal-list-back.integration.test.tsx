/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { MEAL_ANSWER_MENUS_REPLY } from '@/api/mock/data/meal-answer-menus';
import { holdBackButton } from './support/back';
import { grip, raiseCard } from './support/card-grip';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { askOnMap } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';
import { sockets } from './support/fake-socket';

// A restaurant's menu opened from a meal answer's list and closed again (P04 ticket 78).

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

function list(): ReturnType<typeof within> {
  return within(screen.getByTestId('meal-list'));
}

// The stored answer with its first four Plans, so that four candidates have menus.
function fourOf(reply: typeof MEAL_ANSWER_MENUS_REPLY): typeof MEAL_ANSWER_MENUS_REPLY {
  const answer: AnswerReply = { ...reply.answer, plans: reply.answer.plans.slice(0, 4) };
  return { ...reply, answer };
}

// The scrolls the card's own content was given, leaving out the other scroll views', such as the kinds' row.
type Scrolled = jest.SpyInstance<void, Parameters<ScrollView['scrollTo']>, ScrollView>;

function cardScrolls(scrolled: Scrolled): Parameters<ScrollView['scrollTo']>[0][] {
  return scrolled.mock.contexts.flatMap((view, at) =>
    view.props.testID === 'answer-card-content' ? [scrolled.mock.calls[at]?.[0]] : [],
  );
}

// P04 ticket 78 (the user's words: "뒤로가기를 눌렀을 때, 이전 스크롤 위치로 돌아가면 좋을 것 같아"). The content's scroll runs
// natively, so here the list's place is its top: `answer-layer-scroll` checks the place kept. Partitions: back by
// "‹ N곳 목록" and by Android's back button; the menu opened at low.
describe('the list and a menu opened from it', () => {
  it('opens the menu at its top, and ‹ 4곳 목록 puts the list back in its place', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raiseCard();
    const scrolled = jest.spyOn(ScrollView.prototype, 'scrollTo');

    await user.press(list().getByTestId('meal-row-3'));
    expect(cardScrolls(scrolled)).toContainEqual({ y: 0, animated: false });
    scrolled.mockClear();

    await user.press(within(screen.getByTestId('meal-menu')).getByRole('button', { name: '‹ 4곳 목록' }));
    expect(cardScrolls(scrolled)).toContainEqual({ y: 0, animated: false });
  });

  it("puts the list back in its place with Android's back button too, the kind chosen kept", async () => {
    const back = holdBackButton();
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    await raiseCard();
    const kinds = within(screen.getByTestId('kind-chips'));
    await user.press(kinds.getByRole('button', { name: /^한식 /u }));
    const [first] = list().getAllByRole('button', { name: /^\d /u });
    if (first === undefined) {
      throw new Error('The list has a row of 한식');
    }
    await user.press(first);
    expect(screen.getByTestId('meal-menu')).toBeOnTheScreen();
    const scrolled = jest.spyOn(ScrollView.prototype, 'scrollTo');

    await expect(back()).resolves.toBe(true);
    expect(screen.queryByTestId('meal-menu')).toBeNull();
    expect(cardScrolls(scrolled)).toContainEqual({ y: 0, animated: false });
    expect(kinds.getByRole('button', { name: /^한식 /u })).toBeSelected();
  });

  // The user's phone, 2026-11-26: a row pressed at low opened the menu with its head cut through its name. A menu opens
  // as the chosen place's "메뉴 ›" opens it, raising a low card to middle.
  it('raises a low card to middle when a row opens its menu', async () => {
    const user = await askOnMap(server, fourOf(MEAL_ANSWER_MENUS_REPLY));
    expect(grip()).toHaveAccessibilityValue({ text: '작게' });

    await user.press(list().getByTestId('meal-row-1'));

    expect(screen.getByTestId('meal-menu')).toBeOnTheScreen();
    expect(grip()).toHaveAccessibilityValue({ text: '중간' });
  });
});
