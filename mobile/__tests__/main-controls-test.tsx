/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { pass, screen, shownAddress } from './support/app';
import {
  ACTIVE_PARTY,
  AI_INPUT,
  button,
  DINNER_ROW,
  findButton,
  FOLD_FRIENDS,
  FOOTPRINTS,
  FRIEND_PILL,
  FRIEND_ROW,
  FULL_SCREEN,
  layCard,
  LAYERS,
  PARTY_ROW,
  SEND,
} from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, NOT_READY, press } from './support/markers';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const CREDIT = '지도 데이터 출처 보기';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the controls above the navigation of the main screen', () => {
  it('shows "오늘의 발자국" with its words, and "활성 파티" with the members who share', async () => {
    await openMain();

    expect(button(FOOTPRINTS)).toHaveTextContent('민준서연지호오늘의 발자국친구 5명의 오늘');
    expect(button(ACTIVE_PARTY)).toHaveTextContent('활성 파티3명 공유 중');
    expect(button(LAYERS)).toBeVisible();
    expect(button(AI_INPUT)).toHaveTextContent('무엇이든 부탁해 보세요');
  });

  it('draws the three faces of "오늘의 발자국" as decoration, hidden from a screen reader', async () => {
    await openMain();

    const faces = within(button(FOOTPRINTS));
    expect(faces.queryByLabelText('이서연')).toBeNull();
    for (const name of ['김민준', '이서연', '박지호']) {
      expect(faces.getByLabelText(name, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });

  it('has no "활성 파티" for a User in no Party', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    await openMain();

    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(FOOTPRINTS)).toBeVisible();
  });

  it('shows "오늘의 발자국" by its name alone when what it shows did not come', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'getFootprints';
    await openMain();

    expect(button(FOOTPRINTS)).toHaveTextContent('오늘의 발자국');
  });
});

describe('a control of the main screen whose feature belongs to another task', () => {
  it.each([
    ["a Party's row", PARTY_ROW, '/room/q-ai'],
    ["a Shared Quest's row", DINNER_ROW, '/room/q-dinner'],
    ['활성 파티', ACTIVE_PARTY, '/room/q-ai'],
  ] as const)("opens the Quest's room: %s", async (_control, name, address) => {
    const user = await openMain();

    await press(user, name);
    await pass(500);

    expect(shownAddress()).toBe(address);
    expect(screen.getByRole('header', { name: '파티' })).toBeVisible();
  });

  it.each([['오늘의 발자국', FOOTPRINTS]] as const)('says that it is not ready: %s', async (_control, name) => {
    const user = await openMain();

    await press(user, name);

    expect(screen.getByText(NOT_READY)).toBeVisible();
    expect(screen.queryByTestId('map-card')).toBeNull();
    await pass(2400);
    expect(screen.queryByText(NOT_READY)).toBeNull();
  });
});

describe("the main screen's AI input", () => {
  it('is a button with the look of the empty input, not a field: nothing takes the focus or a letter', async () => {
    await openMain();

    expect(button(AI_INPUT)).toBeVisible();
    expect(screen.queryByPlaceholderText('무엇이든 부탁해 보세요')).toBeNull();
    expect(screen.queryByDisplayValue('')).toBeNull();
  });

  it('says that it is not ready when it is pressed', async () => {
    const user = await openMain();

    await press(user, AI_INPUT);

    expect(screen.getByText(NOT_READY)).toBeVisible();
  });

  it('reads its send button as disabled, and says that it is not ready when that is pressed', async () => {
    const user = await openMain();
    expect(button(SEND)).toBeDisabled();

    await press(user, SEND);

    expect(screen.getByText(NOT_READY)).toBeVisible();
  });
});

describe('the main screen while a card is open', () => {
  it('hides "오늘의 발자국", "활성 파티" and the 편의기능 button, and keeps the lists, the AI input and the navigation', async () => {
    const user = await openMain();

    await press(user, FRIEND);

    expect(findButton(FOOTPRINTS)).toBeNull();
    expect(findButton(ACTIVE_PARTY)).toBeNull();
    expect(findButton(LAYERS)).toBeNull();
    expect(button(FRIEND_PILL)).toBeVisible();
    expect(button(FOLD_FRIENDS)).toBeVisible();
    expect(button(FRIEND_ROW)).toBeVisible();
    expect(button(FULL_SCREEN)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();

    await press(user, '닫기');
    expect(button(FOOTPRINTS)).toBeVisible();
    expect(button(LAYERS)).toBeVisible();
  });
});

describe("the map's credit on the main screen", () => {
  it('sits above the row of buttons, in line with the controls at the left', async () => {
    await openMain();

    // The row ends 126 above the navigation; the map's own margin of 8 is over that.
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 134 });
  });

  it('sits above a card while one is open', async () => {
    const user = await openMain();
    await press(user, FRIEND);
    await layCard(180);

    // The card's bottom is 72 above the navigation and it is 180 high.
    expect(button(CREDIT)).toHaveStyle({ left: 16, bottom: 260 });
  });

  it('leaves the card and the AI input clear of each other', async () => {
    const user = await openMain();
    await press(user, FRIEND);

    // The card's bottom is 72 above the navigation. The input's is 12 and it is 50 high: its top is 10 under the card.
    expect(screen.getByTestId('map-card')).toHaveStyle({ bottom: 72 });
    expect(screen.getByLabelText(AI_INPUT)).toHaveStyle({ height: 40 });
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 });
  });
});
