/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import type { TouchEventLike } from '@/screens/main/tutorial/use-map-tap';
import { pass, screen } from './support/app';
import { button, findButton, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS } from './support/main';
import { lookOf, press, wordsUnder, zoomIn } from './support/markers';
import { startFresh } from './support/mocks';
import { openSheet, pressAndWait, started, type User } from './support/tutorial';

// 지도에서 보기 of a 새내기 튜토리얼 quest drops the tutorial place pin on the main map (P13 "지도에서 보기 drops a
// pin"), against the mocks: one pin with the place's words, replaced by the next 지도에서 보기, and a tap on it opens
// the card at its Place, if the map has one there. A tap on the map elsewhere removes it; zooming keeps it.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const NIGHT_SHUTTLE_ROW =
  '새내기 튜토리얼 · 이동 · 10/15 · 야간 셔틀 타기 · 완료 조건 · 야간 도서관 셔틀이나 심야셔틀 타 보기';
const S_CARD_ROW = '새내기 튜토리얼 · 생활 · 1/15 · 학생증(S-CARD) 발급받기 · 완료 조건 · 학생증 받기';
const ENGINEERING = '제2공학관(302동) (시험기간 심야셔틀)';
const SHUTTLE_STOP = '행정관 앞 (야간 도서관 셔틀)';
const LOOK = 'tutorialPlace';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function showOnMap(user: User, words: string): Promise<void> {
  await user.press(button(`${words} 지도에서 보기`));
  await pass(1000);
}

function pins(): unknown[] {
  return screen.queryAllByTestId(LOOK);
}

// A touch of one finger on the map, as the View around it sees it: a tap unless it moves or lasts.
function touchAt(x: number, timestamp: number, fingers: number): { nativeEvent: TouchEventLike['nativeEvent'] } {
  return { nativeEvent: { pageX: x, pageY: 300, timestamp, touches: Array.from({ length: fingers }, () => ({})) } };
}

async function touchAndLift({ moved = 0, ms = 100 }: { moved?: number; ms?: number } = {}): Promise<void> {
  const around = screen.getByTestId('main-map-touches');
  await fireEvent(around, 'touchStart', touchAt(150, 1000, 1));
  await fireEvent(around, 'touchEnd', touchAt(150 + moved, 1000 + ms, 0));
}

async function touchMap(touch: { moved?: number; ms?: number } = {}): Promise<void> {
  await touchAndLift(touch);
  await pass(500);
}

async function turnDiningOn(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^식당/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

describe('the tutorial place pin', () => {
  it("stands at the place with the place's words under it", async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);

    await showOnMap(user, SHUTTLE_STOP);

    expect(pins()).toHaveLength(1);
    expect(lookOf(SHUTTLE_STOP)).toBe(LOOK);
    expect(wordsUnder(SHUTTLE_STOP, SHUTTLE_STOP)).not.toBeNull();
  });

  it('is replaced by the next 지도에서 보기', async () => {
    await started('s-card');
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await pressAndWait(user, S_CARD_ROW);
    await showOnMap(user, '우리은행 (4동)');

    expect(pins()).toHaveLength(1);
    expect(lookOf('우리은행 (4동)')).toBe(LOOK);
    expect(findButton(SHUTTLE_STOP)).toBeNull();
  });

  it('goes when the tutorial is stopped', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await pressAndWait(user, '새내기 튜토리얼 시작하기');
    await pressAndWait(user, '튜토리얼 그만하기');

    expect(pins()).toEqual([]);
  });
});

describe('a touch on the map', () => {
  it('that is a tap elsewhere than on the pin removes it', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await touchMap();

    expect(pins()).toEqual([]);
  });

  it('that drags, or a zoom, keeps it', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await touchMap({ moved: 80 });
    await zoomIn(user, 1);
    await pass(500);

    expect(pins()).toHaveLength(1);
  });

  it("that ends on the pin, whose press comes after the touch's end, keeps it", async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await touchAndLift();
    await press(user, SHUTTLE_STOP);
    await pass(500);

    expect(pins()).toHaveLength(1);
  });
});

describe('a tap on the pin', () => {
  it('opens the card of the 식당 at its Place, as a tap on its marker does, and the pin stays', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await turnDiningOn(user);
    await showOnMap(user, ENGINEERING);

    await press(user, ENGINEERING);
    await pass(500);

    expect(screen.getByRole('header', { name: '302동식당' })).toBeVisible();
    expect(pins()).toHaveLength(1);
  });

  it('opens nothing at the 행정관 셔틀 정류장, and the pin and its words stay', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await showOnMap(user, SHUTTLE_STOP);

    await press(user, SHUTTLE_STOP);
    await pass(500);

    expect(findButton('닫기')).toBeNull();
    expect(pins()).toHaveLength(1);
    expect(wordsUnder(SHUTTLE_STOP, SHUTTLE_STOP)).not.toBeNull();
  });

  it('goes once another thing on the map is selected', async () => {
    const user = await openSheet('night-shuttle', NIGHT_SHUTTLE_ROW);
    await turnDiningOn(user);
    await showOnMap(user, SHUTTLE_STOP);

    await press(user, '식당 · 302동식당');
    await pass(500);

    expect(pins()).toEqual([]);
  });
});
