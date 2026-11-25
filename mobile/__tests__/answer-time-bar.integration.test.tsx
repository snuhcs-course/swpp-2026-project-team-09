/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply } from '@/api/assistant-types';
import { MEAL_ANSWER_REPLY } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_ALONE } from '@/api/mock/data/meal-answers';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { act, fireEvent, within } from '@testing-library/react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { StyleSheet, type ViewStyle } from 'react-native';
import { screen } from './support/app';
import { askOnMap, card, timeBar as bar } from './support/answer-map';
import { grip as sheetGrip, raiseCard } from './support/card-grip';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { layStage } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { press } from './support/markers';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// P04 ticket 01: the time band leaves the card for a bar under the pill, folded to one row. Over the stored answer to
// "배고파, 민수랑 같이" (Tuesday 2026-11-17): its first Plan runs from 12:15 to 12:43, 나 is busy until 11:50 ("301동
// 수업") and from 13:00 ("24동 수업"), 민수 until 12:15 ("302동 수업"). The same answer asked on Monday is tomorrow's.

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

const UNFOLD = '사람별 시간 펼치기';
const FOLD = '사람별 시간 접기';

// The stored reply with every band's now on the Monday before.
const ASKED_ON_MONDAY: AssistantReply = {
  ...MEAL_ANSWER_REPLY,
  answer: {
    ...MEAL_ANSWER_REPLY.answer,
    plans: MEAL_ANSWER_REPLY.answer.plans.map((plan) => ({
      ...plan,
      band: { ...plan.band, now: '2026-11-16T11:50:00+09:00' },
    })),
  },
};

const WORDS_ONLY: AssistantReply = {
  text: '학생증은 학생지원센터에서 다시 받아요.',
  mapButtons: [],
  cards: [],
  proposal: null,
};

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

describe('the time bar', () => {
  it("stands at the top with the span's words, and the card holds no band", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().getByText('12:15–12:43 · 식사 28분')).toBeVisible();
    expect(card().queryByTestId('time-band-track')).toBeNull();
  });

  it("says the span's day when it is not today", async () => {
    await askOnMap(server, ASKED_ON_MONDAY);

    expect(bar().getByText('내일(화) 점심 12:15–12:43 · 식사 28분')).toBeVisible();
  });

  it("is folded to one row, bounded by the busy stretches at the span's ends", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().queryByText('민수')).toBeNull();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
    expect(bar().getByText('13:00 24동 수업')).toBeVisible();
  });

  it('unfolds to a row for each person at a press, its ends kept, and folds again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, UNFOLD);

    expect(bar().getByText('나')).toBeVisible();
    expect(bar().getByText('민수')).toBeVisible();
    expect(bar().getByText('13:00 24동 수업')).toBeVisible();
    expect(bar().queryByText('11:30')).toBeNull();

    await press(user, FOLD);

    expect(bar().queryByText('민수')).toBeNull();
  });
});

describe('the folded bar', () => {
  it("lets the first lane's busy stretches show under the second lane's", async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    const [, minsu] = MEAL_ANSWER_REPLY.answer.plans[0]?.band.lanes ?? [];

    const lane = screen.getByTestId(`time-band-lane-${minsu?.userId ?? ''}`);

    expect(lane.children[0]).toHaveStyle({ backgroundColor: 'transparent' });
  });
});

describe('an answer without a time', () => {
  it('has no bar', async () => {
    await askOnMap(server, WORDS_ONLY);

    expect(screen.getByText('학생증은 학생지원센터에서 다시 받아요.')).toBeVisible();
    expect(screen.queryByTestId('time-bar')).toBeNull();
  });
});

// Partitions: the chip at the usual text size, and wider at a larger one (P04 ticket 37: on a phone 360 wide the words
// ran under "＋ 같이").
describe("the bar's head", () => {
  it('keeps the words clear of "＋ 같이" by the chip\'s own width once it is laid out', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    expect(screen.getByTestId('time-band-words')).toHaveStyle({ paddingRight: 72 });

    await fireEvent(screen.getByTestId('time-bar-add'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 95.4, height: 34 } },
    });

    expect(screen.getByTestId('time-band-words')).toHaveStyle({ paddingRight: 96 });
  });
});

// The bar's translation as React holds it: where it rests (P04 ticket 61).
function barShift(): number {
  const style: unknown = screen.getByTestId('time-bar').props.style;
  const flat = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  const shift: unknown = Array.isArray(flat.transform) ? flat.transform[0] : undefined;
  return typeof shift === 'object' && shift !== null && 'translateY' in shift ? Number(shift.translateY) : 0;
}

async function stepGrip(actionName: 'tuck' | 'untuck'): Promise<void> {
  await fireEvent(screen.getByTestId('time-card-grip'), 'accessibilityAction', { nativeEvent: { actionName } });
}

// P04 ticket 61 (boards k1–k4). Partitions: tucked and back, by the grip's steps for a screen reader. Expected values:
// a bar laid out 100 high under a stage top of 0 leaves a strip of 20; the hairline over the strip parts it from the
// card's content, and with the strip alone in sight there is none.
describe("the time bar's tuck", () => {
  it('slides up by its grip until a strip shows without its hairline, and comes back down', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    const timeBar = screen.getByTestId('time-bar');
    await fireEvent(timeBar, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 100 } } });
    const style: unknown = timeBar.props.style;
    const top = Number(StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).top);
    expect(screen.getByTestId('time-card-rule')).toHaveStyle({ height: StyleSheet.hairlineWidth });

    await stepGrip('tuck');
    expect(barShift()).toBe(-(top + 100 - 20));
    expect(screen.getByTestId('time-card-grip')).toHaveProp('accessibilityActions', [
      { name: 'untuck', label: '시간 카드 펴기' },
    ]);
    expect(screen.queryByTestId('time-card-rule')).toBeNull();

    await stepGrip('untuck');
    expect(barShift()).toBe(0);
    expect(screen.getByTestId('time-card-rule')).toBeOnTheScreen();
  });
});

// A drag on the grip, `dy` down, let go slowly.
async function dragGrip(dy: number): Promise<void> {
  await act(() => {
    fireGestureHandler(getByGestureTestId('time-card-grip-drag'), [
      { translationY: 0, velocityY: 0 },
      { translationY: dy / 2, velocityY: 0 },
      { translationY: dy, velocityY: 0 },
    ]);
  });
}

// The rows for each person laid out `height` high, as a phone lays them out before the card opens, while a screen
// reader still passes them by.
async function layRows(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('time-card-rows', { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 320, height } },
  });
}

function placeOf(element: ReturnType<typeof screen.getByTestId>): Pick<ViewStyle, 'left' | 'width'> {
  const style: unknown = element.props.style;
  const { left, width } = StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
  return { left, width };
}

// Where the band's body stands on the track.
function bodyPlace(): Pick<ViewStyle, 'left' | 'width'> {
  return placeOf(screen.getByRole('adjustable', { name: '시간 띠' }));
}

// P04 ticket 61 (boards p1, p2). Partitions: pulled down past the rows' height and pushed back up; a press on the band's
// words; a bar of one lane pulled down. Expected values: open, the track keeps its range, the free time around the span
// between the busy stretches at its ends, 12:00 to 13:15, and not the band's whole range of 11:30 to 13:30; a busy
// stretch that runs past it is cut at the track's end: 나's class from 13:00 to 13:30 at 80% to the end, 민수's from
// 11:30 to 12:15 from the start to 20%.
describe("the time bar's grip pulled down", () => {
  it('brings out a row for each person under a track that keeps its range, and folds them when pushed up', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layRows(64);
    const folded = bodyPlace();

    await dragGrip(120);

    expect(bar().getByText('나')).toBeVisible();
    expect(bar().getByText('민수')).toBeVisible();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
    expect(bar().queryByText('11:30')).toBeNull();
    expect(bodyPlace()).toEqual(folded);
    expect(screen.getByTestId('time-card-grip')).toBeExpanded();
    expect(screen.getByTestId('time-card-rule')).toBeOnTheScreen();
    const busy = within(screen.getByTestId('time-card-rows'))
      .getAllByTestId('time-card-busy')
      .map((one) => placeOf(one));
    expect(busy).toContainEqual({ left: '80%', width: `${(1 - 60 / 75) * 100}%` });
    expect(busy).toContainEqual({ left: '0%', width: '20%' });

    await dragGrip(-64);

    expect(bar().queryByText('민수')).toBeNull();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
    expect(barShift()).toBe(0);
  });

  it('opens nothing on a bar of one lane, whose grip only tucks', async () => {
    await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE });

    await dragGrip(120);

    expect(barShift()).toBe(0);
    expect(screen.queryByTestId('time-card-rows', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('time-card-grip')).toHaveProp('accessibilityLabel', '시간 카드 손잡이');
    expect(screen.queryByRole('button', { name: /시간 펼치기/u })).toBeNull();
  });

  it('opens nothing at a press on the band’s words', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(screen.getByTestId('time-band-words'));

    expect(bar().queryByText('민수')).toBeNull();
    expect(screen.getByTestId('time-card-grip')).toBeCollapsed();
  });
});

// P04 ticket 61, the user's rule: only one of the time card and the answer sheet is expanded at a time, the card
// touched last winning, so that the time card's grip is never under the sheet. Partitions: the time card opened over a
// high sheet, then folded; the sheet raised to high under an open time card.
describe('the time card and the answer sheet', () => {
  it('brings a high sheet down to middle as the time card opens, and leaves it there as it folds', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await layRows(64);
    await raiseCard();
    await raiseCard();
    expect(sheetGrip()).toHaveAccessibilityValue({ text: '크게' });

    await dragGrip(120);

    expect(screen.getByTestId('time-card-grip')).toBeExpanded();
    expect(sheetGrip()).toHaveAccessibilityValue({ text: '중간' });

    await dragGrip(-64);

    expect(screen.getByTestId('time-card-grip')).toBeCollapsed();
    expect(sheetGrip()).toHaveAccessibilityValue({ text: '중간' });
  });

  it('folds an open time card, not tucking it, as the sheet rises to high', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await press(user, UNFOLD);
    await raiseCard();
    expect(screen.getByTestId('time-card-grip')).toBeExpanded();

    await raiseCard();

    expect(sheetGrip()).toHaveAccessibilityValue({ text: '크게' });
    expect(screen.getByTestId('time-card-grip')).toBeCollapsed();
    expect(barShift()).toBe(0);
  });
});
