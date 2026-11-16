/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-19  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import {
  ACTIVE_PARTY,
  AI_INPUT,
  button,
  DINNER_ROW,
  findButton,
  FOLD_FRIENDS,
  FRIEND_PILL,
  FRIEND_ROW,
  FULL_SCREEN,
  layCard,
  LAYERS,
  PARTY_ROW,
  SEND,
} from './support/lists';
import { hideKeyboard, KEYBOARD, LIFT, quietDismiss, showKeyboard } from './support/keyboard';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const CREDIT = '지도 데이터 출처 보기';

type User = Awaited<ReturnType<typeof openMain>>;

// Sends the words from the map's bar, which the mocks answer.
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

describe('the controls above the navigation of the main screen', () => {
  it('shows "활성 파티" with the members who share, and no "오늘의 발자국"', async () => {
    await openMain();

    expect(findButton(/^오늘의 발자국/u)).toBeNull();
    expect(button(ACTIVE_PARTY)).toHaveTextContent('활성 파티3명 공유 중');
    expect(button(LAYERS)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toHaveProp('placeholder', '무엇이든 부탁해 보세요');
  });

  it('has no "활성 파티" for a User in no Party', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'getMyParty';
    await openMain();

    expect(findButton(/^활성 파티/u)).toBeNull();
    expect(button(LAYERS)).toBeVisible();
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
});

describe("the main screen's AI input", () => {
  it('is a field with the placeholder, whose send button is disabled', async () => {
    await openMain();

    expect(screen.getByPlaceholderText('무엇이든 부탁해 보세요')).toBe(screen.getByLabelText(AI_INPUT));
    expect(button(SEND)).toBeDisabled();
  });

  it('shows the answer frame, which the mocks answer where the app asks no main server', async () => {
    const user = await openMain();

    await ask(user, '식사 메뉴 추천');

    expect(screen.getByTestId('answer-card')).toHaveTextContent(/^식사 메뉴 추천오늘 메뉴예요\./u);
  });
});

describe("the main screen's AI input over the keyboard", () => {
  it('rises by the keyboard less the navigation under it, and comes back when it hides', async () => {
    await openMain();
    // The bar is 12 above the navigation.
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 });

    await showKeyboard(KEYBOARD);
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 + LIFT });

    await hideKeyboard();
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 });
  });
});

describe('what puts the keyboard down on the main screen', () => {
  it("puts the keyboard down when Android's back button closes the answer frame", async () => {
    const back = holdBackButton();
    const user = await openMain();
    await ask(user, '식사 메뉴 추천');
    const dismiss = quietDismiss();

    await back();

    expect(screen.queryByTestId('answer-pill')).toBeNull();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

describe('the main screen while a card is open', () => {
  it('hides "활성 파티" and the 편의기능 button, and keeps the lists, the AI input and the navigation', async () => {
    const user = await openMain();

    await press(user, FRIEND);

    expect(findButton(ACTIVE_PARTY)).toBeNull();
    expect(findButton(LAYERS)).toBeNull();
    expect(button(FRIEND_PILL)).toBeVisible();
    expect(button(FOLD_FRIENDS)).toBeVisible();
    expect(button(FRIEND_ROW)).toBeVisible();
    expect(button(FULL_SCREEN)).toBeVisible();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
    expect(screen.getByRole('tab', { name: '행사' })).toBeVisible();

    await press(user, '닫기');
    expect(button(ACTIVE_PARTY)).toBeVisible();
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
    expect(screen.getByLabelText(AI_INPUT)).toHaveStyle({ minHeight: 40 });
    expect(screen.getByTestId('ai-input')).toHaveStyle({ bottom: 12 });
  });
});
