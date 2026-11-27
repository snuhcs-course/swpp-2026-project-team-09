/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
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
import { barShift, layFolded, layRows, stepGrip } from './support/time-card';
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

  // Since P04 ticket 82 what starts after the span stands under the bar only when nothing bounds it on the left.
  it('is folded to one row, with what bounds the span on the left under it', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);

    expect(bar().queryByText('민수')).toBeNull();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
    expect(bar().queryByText('13:00 24동 수업')).toBeNull();
  });

  it('unfolds to a row for each person at a press, its ends kept, and folds again', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await press(user, UNFOLD);

    expect(bar().getByText('나')).toBeVisible();
    expect(bar().getByText('민수')).toBeVisible();
    expect(bar().getByText('민수 12:15 302동 수업 끝')).toBeVisible();
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

// P04 ticket 61 (boards k1–k4). Partitions: tucked and back, by the grip's steps for a screen reader. Expected values:
// the hairline over the strip parts it from the card's content.
describe("the time bar's fold", () => {
  // P01 ticket 22: the tucked strip is gone; folded, an answer to one request leaves one tab at the top's centre.
  it('folds by its grip to the tab at the top, and the tab brings it back with its hairline', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layFolded(100);
    expect(screen.getByTestId('time-card-rule')).toHaveStyle({ height: StyleSheet.hairlineWidth });

    await stepGrip('tuck');
    expect(screen.queryByTestId('time-bar')).toBeNull();
    expect(screen.getByTestId('top-tab')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('top-tab'));
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
// words. Expected values: open, the track keeps its range, the free time around the span between the busy stretches at
// its ends, 12:00 to 13:15, and not the band's whole range of 11:30 to 13:30; a busy stretch that runs past it is cut at
// the track's end: 나's class from 13:00 to 13:30 at 80% to the end, 민수's from 11:30 to 12:15 from the start to 20%.
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

  it('opens nothing at a press on the band’s words', async () => {
    const user = await askOnMap(server, MEAL_ANSWER_REPLY);

    await user.press(screen.getByTestId('time-band-words'));

    expect(bar().queryByText('민수')).toBeNull();
    expect(screen.getByTestId('time-card-grip')).toBeCollapsed();
  });
});

// P04 ticket 64, the user's word (2026-11-26): with nobody added the card opens too, to 나's row alone. Partitions:
// pulled open by the grip, then folded by a press on it.
describe('a bar of 나 alone, its grip pulled down', () => {
  it('opens to the row of 나, and folds at a press on the grip', async () => {
    const user = await askOnMap(server, { ...MEAL_ANSWER_REPLY, answer: MEAL_ANSWER_ALONE });
    await layRows(32);

    await dragGrip(120);

    const rows = within(screen.getByTestId('time-card-rows'));
    expect(rows.getByText('나')).toBeVisible();
    expect(rows.getAllByTestId('time-card-busy').length).toBeGreaterThan(0);
    expect(screen.getByTestId('time-card-grip')).toBeExpanded();

    await press(user, FOLD);

    expect(bar().queryByText('나')).toBeNull();
    expect(screen.getByRole('button', { name: UNFOLD })).toBeCollapsed();
  });
});

// P04 ticket 61, the user's rule: only one of the time card and the answer sheet is expanded at a time, the card
// touched last winning, so that the time card's grip is never under the sheet. Partitions: the time card opened over a
// high sheet, then folded; let go short of open over a high sheet; the sheet raised to high under an open time card.
// The sheet following the finger during the pull is drawn on the UI thread and seen on the phone.
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

  it('leaves a high sheet at high when the time card is let go short of open', async () => {
    await askOnMap(server, MEAL_ANSWER_REPLY);
    await layStage(390, 760);
    await layRows(64);
    await raiseCard();
    await raiseCard();

    await dragGrip(20);

    expect(screen.getByTestId('time-card-grip')).toBeCollapsed();
    expect(sheetGrip()).toHaveAccessibilityValue({ text: '크게' });
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
