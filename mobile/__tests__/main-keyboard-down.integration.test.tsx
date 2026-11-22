/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen, shownAddress } from './support/app';
import { hideKeyboard, KEYBOARD, quietDismiss, showKeyboard } from './support/keyboard';
import { AI_INPUT, button, DINNER_ROW, findButton, FRIEND_ROW, SEND } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, marker, press } from './support/markers';
import { startFresh } from './support/mocks';
import { CONTINUE, reopenAnswer } from './support/questions';

// A press beside the AI input while its keyboard is up only puts the keyboard down (P15 ticket 09), on the everyday
// map and in the answer frame, which the mocks answer. The tests' renderer lays nothing out, so a press reaches the
// element it is given: what a press beside the bar lands on is read from what is drawn over what.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SCRIM = '키보드 내리기';
const NOTICE = '대화 내용은 AI 제공자에게 전송돼요';
const EARLIER = CONTINUE;

type User = Awaited<ReturnType<typeof openMain>>;
type Found = ReturnType<typeof screen.getByTestId>;

// Whether `upper` is drawn over `lower`: of the children of the nearest element that holds both, React Native draws
// the later over the earlier.
function drawnOver(upper: Found, lower: Found): boolean {
  const lowerLine: Found[] = [];
  for (let at: Found | null = lower; at !== null; at = at.parent) {
    lowerLine.push(at);
  }
  let child = upper;
  for (let at = upper.parent; at !== null; child = at, at = at.parent) {
    const index = lowerLine.indexOf(at);
    if (index > 0) {
      return at.children.indexOf(child) > at.children.indexOf(lowerLine[index - 1]);
    }
  }
  return false;
}

function mapTouches(): Found {
  return screen.getByTestId('main-map-touches');
}

async function ask(user: User, words: string): Promise<void> {
  await user.type(screen.getByLabelText(AI_INPUT), words);
  await press(user, SEND);
  await pass(300);
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Partitions: the keyboard up and down.
describe('a press beside the AI input on the everyday map', () => {
  it('lands, while the keyboard is up, on a scrim over the whole stage, the map, a marker, the rows and the zoom', async () => {
    await openMain();

    await showKeyboard(KEYBOARD);

    const scrim = button(SCRIM);
    expect(scrim).toHaveStyle({ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 });
    for (const under of [mapTouches(), marker(FRIEND), button(FRIEND_ROW), button(DINNER_ROW), button('확대')]) {
      expect(drawnOver(scrim, under)).toBe(true);
    }
  });

  it('meets no scrim while the keyboard is down', async () => {
    await openMain();

    expect(findButton(SCRIM)).toBeNull();
  });
});

// Partitions: a press on the scrim, then once the keyboard is down; words in the field.
describe('a press on the scrim on the everyday map', () => {
  it('puts the keyboard down and does nothing else: no card opens and the screen stays', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);
    const dismiss = quietDismiss();

    await press(user, SCRIM);

    expect(dismiss).toHaveBeenCalled();
    expect(screen.queryByTestId('map-card')).toBeNull();
    expect(shownAddress()).toBe('/main');
  });

  it('reaches what is under it once the keyboard is down: a marker opens its card', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);
    quietDismiss();
    await press(user, SCRIM);

    await hideKeyboard();

    expect(findButton(SCRIM)).toBeNull();
    await press(user, FRIEND);
    expect(screen.getByTestId('map-card')).toBeVisible();
  });

  it('keeps the words written so far, which the send button then sends', async () => {
    const user = await openMain();
    await user.type(screen.getByLabelText(AI_INPUT), '식사 메뉴 추천');
    await showKeyboard(KEYBOARD);
    quietDismiss();

    await press(user, SCRIM);
    await hideKeyboard();

    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('식사 메뉴 추천');
    await press(user, SEND);
    await pass(300);
    expect(screen.getByTestId('answer-card')).toHaveTextContent(/^식사 메뉴 추천오늘 메뉴예요\./u);
  });
});

// Partitions: the bar's field and buttons, an example and the line under the examples, the chip "이어서" (P04 ticket 11).
describe("the AI input's own parts while the keyboard is up", () => {
  it('stand over the scrim: the bar and the examples', async () => {
    await openMain();

    await showKeyboard(KEYBOARD);

    const scrim = button(SCRIM);
    expect(drawnOver(screen.getByTestId('ai-input'), scrim)).toBe(true);
    expect(drawnOver(button('배고파'), scrim)).toBe(true);
  });

  it('let a press on the line under the examples through to the scrim', async () => {
    await openMain();

    await showKeyboard(KEYBOARD);

    expect(drawnOver(screen.getByText(NOTICE), button(SCRIM))).toBe(true);
    expect(screen.getByText(NOTICE).parent).toHaveStyle({ pointerEvents: 'none' });
  });

  it('send an example as before', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);

    await press(user, '배고파');
    await pass(300);

    expect(screen.getByTestId('answer-pill')).toHaveTextContent(/^배고파/u);
  });

  it('show the hidden answer frame again by the chip "이어서"', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    await press(user, '답 닫기');
    await showKeyboard(KEYBOARD);

    await reopenAnswer(user);

    expect(screen.getByTestId('answer-pill')).toHaveTextContent(/^식사 메뉴 추천/u);
  });
});

// Partitions: words in the input, then none again (P04 ticket 33).
describe('the examples over the keyboard', () => {
  it('give way once the input holds words, with the line under them, and come back when it is empty', async () => {
    const user = await openMain();
    await showKeyboard(KEYBOARD);

    await user.type(screen.getByLabelText(AI_INPUT), '셔틀');

    expect(screen.queryByTestId('asked-examples')).toBeNull();
    expect(screen.queryByText(NOTICE)).toBeNull();
    await user.clear(screen.getByLabelText(AI_INPUT));
    expect(button('배고파')).toBeVisible();
    expect(screen.getByText(NOTICE)).toBeVisible();
  });
});

// Partitions: what the scrim stands over and under; a press on it.
describe('a press beside the AI input in the answer frame', () => {
  it('lands, while the keyboard is up, on a scrim over the map, under the card, the pill and the bar', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');

    await showKeyboard(KEYBOARD);

    const scrim = button(SCRIM);
    expect(drawnOver(scrim, mapTouches())).toBe(true);
    for (const over of [screen.getByTestId('answer-card'), button('답 닫기'), button('새 대화')]) {
      expect(drawnOver(over, scrim)).toBe(true);
    }
    expect(drawnOver(screen.getByTestId('ai-input'), scrim)).toBe(true);
  });

  it('puts the keyboard down and keeps the frame', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    await showKeyboard(KEYBOARD);
    const dismiss = quietDismiss();

    await press(user, SCRIM);

    expect(dismiss).toHaveBeenCalled();
    expect(screen.getByTestId('answer-pill')).toHaveTextContent(/^식사 메뉴 추천/u);
    expect(screen.getByTestId('answer-card')).toBeVisible();
  });
});

// Partitions: the keyboard up and down.
describe("a press on the answer pill's words", () => {
  it('puts the keyboard down while it is up, and keeps the frame', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    await showKeyboard(KEYBOARD);
    const dismiss = quietDismiss();

    await user.press(within(screen.getByTestId('answer-pill')).getByText('식사 메뉴 추천'));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('answer-pill')).toHaveTextContent(/^식사 메뉴 추천/u);
  });

  it('opens the list of questions while the keyboard is down (P04 ticket 10)', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    const dismiss = quietDismiss();

    await user.press(within(screen.getByTestId('answer-pill')).getByText('식사 메뉴 추천'));

    expect(dismiss).not.toHaveBeenCalled();
    expect(screen.getByTestId('answer-pill')).toHaveTextContent(/^식사 메뉴 추천/u);
    expect(screen.getByTestId('question-list')).toBeVisible();
  });
});

// Partitions: "답 닫기" and "새 대화".
describe("the answer pill's buttons while the keyboard is up", () => {
  it('closes the frame by "답 닫기", keeping the conversation, as before', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    await showKeyboard(KEYBOARD);
    quietDismiss();

    await press(user, '답 닫기');

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(screen.getByRole('button', { name: EARLIER })).toBeVisible();
  });

  it('keeps the conversation aside by "새 대화", whose list "지난 대화 1개" opens (P04 ticket 10)', async () => {
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    await showKeyboard(KEYBOARD);

    await press(user, '새 대화');

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(findButton(EARLIER)).toBeNull();
    expect(button('지난 대화 1개')).toBeVisible();
  });
});
