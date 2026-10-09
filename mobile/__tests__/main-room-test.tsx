/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent } from '@testing-library/react-native';
import { CollapseButton } from '@/screens/main/list-parts';
import { screen } from './support/app';
import {
  ACTIVE_PARTY,
  button,
  CLASS_ROW,
  DINNER_ROW,
  findButton,
  FOLD_FRIENDS,
  FOOTPRINTS,
  FRIEND_ROW,
  FULL_SCREEN,
  layCard,
  layStage,
  LAYERS,
  UNFOLD_QUESTS,
} from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const CREDIT = '© OpenStreetMap · 국토지리정보원';
const CREDIT_BUTTON = '지도 데이터 출처 보기';

function rows(list: 'friend' | 'quest'): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId(`${list}-rows`);
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

// A test's status bar takes nothing, so a window's top is 100 under the stage's: 52, the header's 40 and 8.
describe("the touches of the map beside the main screen's lists", () => {
  it("lets through what does not start on a row: the window, its content and a row's box take no touch", async () => {
    await openMain();

    for (const window of [rows('friend'), rows('quest')]) {
      expect(window).toHaveStyle({ pointerEvents: 'box-none' });
      expect(window).toHaveProp('contentContainerStyle', expect.objectContaining({ pointerEvents: 'box-none' }));
    }
    expect(button(FRIEND_ROW).parent).toHaveStyle({ pointerEvents: 'box-none' });
    expect(button(CLASS_ROW).parent).toHaveStyle({ pointerEvents: 'box-none' });
  });

  it('keeps a window as wide as its widest row, at the side of its list, and a row as wide as its words', async () => {
    await openMain();

    expect(rows('friend')).toHaveStyle({ alignSelf: 'flex-start', maxWidth: '100%', flexGrow: 0 });
    expect(rows('quest')).toHaveStyle({ alignSelf: 'flex-end', maxWidth: '100%', flexGrow: 0 });
    expect(button(FRIEND_ROW)).toHaveStyle({ alignSelf: 'flex-start', maxWidth: '100%' });
    expect(button(CLASS_ROW)).toHaveStyle({ alignSelf: 'flex-end', maxWidth: '100%' });
  });

  it('takes touches from a touch on a row until that touch or its drag ends, so that the list scrolls', async () => {
    await openMain();

    await fireEvent(rows('friend'), 'touchStart');
    expect(rows('friend')).toHaveStyle({ pointerEvents: 'auto' });
    expect(rows('quest')).toHaveStyle({ pointerEvents: 'box-none' });
    await fireEvent(rows('friend'), 'scrollEndDrag');
    expect(rows('friend')).toHaveStyle({ pointerEvents: 'box-none' });

    await fireEvent(rows('friend'), 'touchStart');
    await fireEvent(rows('friend'), 'touchEnd');
    expect(rows('friend')).toHaveStyle({ pointerEvents: 'box-none' });
  });

  it('keeps the two columns apart on a phone 360 wide: the friend column has what the Quest column leaves', async () => {
    await openMain();

    expect(screen.getByTestId('friend-list')).toHaveStyle({ left: 16, width: 160 });
    expect(screen.getByTestId('quest-list')).toHaveStyle({ right: 16, width: 182 });

    await layStage(360, 700);
    // 16, 146, 182 and 16 are 360.
    expect(screen.getByTestId('friend-list')).toHaveStyle({ left: 16, width: 146 });
    expect(screen.getByTestId('quest-list')).toHaveStyle({ right: 16, width: 182 });
  });
});

describe("the main screen's lists on a low screen", () => {
  it("show three rows on the frame's stage", async () => {
    await openMain();

    await layStage(390, 764);

    expect(rows('friend')).toHaveStyle({ maxHeight: 172 });
    expect(rows('quest')).toHaveStyle({ maxHeight: 172 });
  });

  it('end the Quest list above the zoom control, whose top is 270 above the navigation', async () => {
    await openMain();

    // 550 leaves 172 between the window's top and 8 above the zoom control; 549 does not.
    await layStage(360, 550);
    expect(rows('quest')).toHaveStyle({ maxHeight: 172 });
    await layStage(360, 549);
    expect(rows('quest')).toHaveStyle({ maxHeight: 114 });
    expect(rows('friend')).toHaveStyle({ maxHeight: 172 });
    await layStage(360, 440);
    expect(rows('quest')).toHaveStyle({ maxHeight: 56 });
  });

  it("end the friend list above the map's credit, which sits on the row of buttons", async () => {
    await openMain();

    // The credit's bottom is 134 above the navigation and its line is 14: its top is at 148, and 8 are clear.
    expect(screen.getByRole('button', { name: CREDIT_BUTTON })).toHaveStyle({ left: 16, bottom: 134 });
    expect(screen.getByText(CREDIT)).toHaveStyle({ lineHeight: 14 });
    await layStage(360, 428);
    expect(rows('friend')).toHaveStyle({ maxHeight: 172 });
    await layStage(360, 427);
    expect(rows('friend')).toHaveStyle({ maxHeight: 114 });
  });
});

describe("the main screen's lists on a low screen while a card is open", () => {
  it('end both lists above the credit while a card is open, and fade no row of a window of one', async () => {
    const user = await openMain();
    await layStage(360, 520);
    await press(user, FRIEND);
    await layCard(180);

    // The credit's top is 72, 180, 8 and 14 above the navigation: 274. With 8 clear, 138 are left of 520.
    expect(screen.getByRole('button', { name: CREDIT_BUTTON })).toHaveStyle({ left: 16, bottom: 260 });
    expect(rows('friend')).toHaveStyle({ maxHeight: 114 });
    expect(rows('quest')).toHaveStyle({ maxHeight: 114 });
    expect(button(FRIEND_ROW).parent).toHaveStyle({ opacity: 0.4 });

    await layStage(360, 440);
    expect(rows('friend')).toHaveStyle({ maxHeight: 56 });
    expect(button(FRIEND_ROW).parent).toHaveStyle({ opacity: 1 });
  });

  it('show no row where not one fits over an open card, and keep their heads', async () => {
    const user = await openMain();
    await layStage(360, 400);
    await press(user, FRIEND);
    await layCard(180);

    expect(findButton(FRIEND_ROW)).toBeNull();
    expect(findButton(DINNER_ROW)).toBeNull();
    expect(button(FOLD_FRIENDS)).toBeVisible();
    expect(button(FULL_SCREEN)).toBeVisible();
  });
});

describe('the row of buttons on a narrow screen', () => {
  it("is whole at the frame's width", async () => {
    await openMain();

    await layStage(390, 764);

    expect(button(FOOTPRINTS)).toHaveTextContent('민준서연지호오늘의 발자국친구 5명의 오늘');
    expect(button(ACTIVE_PARTY)).toHaveTextContent('활성 파티3명 공유 중');
  });

  it('lets "오늘의 발자국" give way: one face and no second line at 360, no face at 320', async () => {
    await openMain();

    await layStage(360, 700);
    expect(button(FOOTPRINTS)).toHaveTextContent('민준오늘의 발자국');
    expect(button(ACTIVE_PARTY)).toHaveTextContent('활성 파티3명 공유 중');

    await layStage(320, 700);
    expect(button(FOOTPRINTS)).toHaveTextContent('오늘의 발자국');
    expect(button(ACTIVE_PARTY)).toHaveTextContent('활성 파티3명 공유 중');
    expect(button(LAYERS)).toBeVisible();
  });

  it('shrinks "오늘의 발자국" and never "활성 파티"', async () => {
    await openMain();

    expect(button(FOOTPRINTS)).toHaveStyle({ flexShrink: 1, minWidth: 0 });
    expect(button(ACTIVE_PARTY)).toHaveStyle({ flexShrink: 0 });
  });

  it('keeps "오늘의 발자국" whole on a narrow screen while the User is in no Party', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    await openMain();

    await layStage(320, 700);

    expect(button(FOOTPRINTS)).toHaveTextContent('민준서연지호오늘의 발자국친구 5명의 오늘');
  });
});

describe('a button that collapses a list', () => {
  // The app's Pressable hands a native view the state alone, so the button is asked what it hands on.
  it.each([true, false])('tells its state by `aria-expanded` as well, which the web reads: %s', (open) => {
    const { props } = CollapseButton({ list: '친구 목록', open, pill: 'left', onPress: jest.fn<void, []>() });

    expect(props).toMatchObject({ 'aria-expanded': open, accessibilityState: { expanded: open } });
  });

  it('is read as expanded and as collapsed', async () => {
    const user = await openMain();

    expect(button(FOLD_FRIENDS)).toBeExpanded();
    await press(user, '퀘스트 목록 접기');
    expect(button(UNFOLD_QUESTS)).toBeCollapsed();
  });
});
