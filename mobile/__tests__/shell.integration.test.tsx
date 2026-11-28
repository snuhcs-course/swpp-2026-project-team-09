/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen, shownAddress, startApp } from './support/app';
import { AI_INPUT } from './support/lists';
import { holdBackButton } from './support/back';
import { FOLD_FRIENDS, UNFOLD_FRIENDS } from './support/lists';
import { givePhone, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';

// The signed-in place: the bottom navigation's tabs, the screens above them and Android's back button.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const FINDING_POSITION = '위치를 찾는 중이에요';
const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted' });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('a slot of the bottom navigation', () => {
  it.each([
    ['파티', /^파티/u],
    ['행사', '행사'],
    ['알림', /^알림/u],
    ['내 정보', '내 정보'],
  ] as const)('%s opens its screen, with its slot as the current one', async (title, slot) => {
    const user = await openMain();

    await user.press(screen.getByRole('tab', { name: slot }));

    expect(screen.getByRole('header', { name: title === '알림' ? /^알림/u : title })).toBeVisible();
    expect(screen.getByRole('tab', { name: slot })).toBeSelected();
    expect(screen.getByRole('tab', { name: '지도' })).not.toBeSelected();
  });

  it('지도 shows the map again', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '행사' }));

    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('button', { name: '확대' })).toBeVisible();
  });
});

// The bar of A04 ticket 09: 파티, 행사, the map's round tab in the middle, 알림 and 내 정보, with no 올리기.
describe('the bottom bar', () => {
  it('reads 파티, 행사, 지도, 알림 and 내 정보, with 지도 in the middle, and has no 올리기', async () => {
    await openMain();

    const slots = ['파티', '행사', '지도', '알림', '내 정보'];
    const names = screen
      .getAllByRole('tab')
      .map((tab) => String(tab.props.accessibilityLabel).split(',')[0] ?? '')
      .filter((name) => slots.includes(name));
    expect(names).toEqual(slots);
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.queryByRole('button', { name: '올리기' })).toBeNull();
  });

  it('opens with the AI raised', async () => {
    await openMain();

    expect(screen.getByRole('tab', { name: '지도' })).toBeExpanded();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

describe('the middle on the map', () => {
  it('lowers the AI input, and raises it again with what was typed', async () => {
    const user = await openMain();
    await user.type(screen.getByLabelText(AI_INPUT), '배고파');

    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.queryByLabelText(AI_INPUT)).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeCollapsed();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('button', { name: '확대' })).toBeVisible();

    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.getByLabelText(AI_INPUT)).toHaveDisplayValue('배고파');
    expect(screen.getByRole('tab', { name: '지도' })).toBeExpanded();
  });
});

describe('the middle on another tab', () => {
  it('shows the map with the AI raised, also after it was lowered', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '지도' }));
    await user.press(screen.getByRole('tab', { name: /^파티/u }));

    expect(screen.getByRole('tab', { name: '지도' })).not.toBeSelected();
    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('tab', { name: '지도' })).toBeExpanded();
    expect(screen.getByLabelText(AI_INPUT)).toBeVisible();
  });
});

describe('알림 in the tabs', () => {
  it('is a tab with no 뒤로, and 내 정보 has no bell', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));

    expect(screen.queryByRole('button', { name: /^알림/u })).toBeNull();

    await user.press(screen.getByRole('tab', { name: /^알림/u }));

    expect(screen.getByRole('header', { name: /^알림/u })).toBeVisible();
    expect(screen.getByRole('tab', { name: /^알림/u })).toBeSelected();
    expect(screen.queryByRole('button', { name: '뒤로' })).toBeNull();
    expect(shownAddress()).toBe('/notifications');
  });

  it('is what the address /notifications opens', async () => {
    await openMain();

    await act(() => {
      router.navigate('/notifications');
    });

    expect(screen.getByRole('tab', { name: /^알림/u })).toBeSelected();
  });
});

describe('파티', () => {
  it('has its app bar and the tabs 찾기, 내 파티 and 초대', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^파티/u }));

    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    await user.press(screen.getByRole('tab', { name: /^내 파티/u }));
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=mine');
  });

  it('opens at the tab its address names', async () => {
    await openMain();

    await act(() => {
      router.navigate('/party?tab=invites');
    });

    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
    expect(screen.getByRole('tab', { name: '찾기' })).not.toBeSelected();
  });

  it('opens 파티 만들기 with the 파티 tab’s floating 파티 만들기', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^파티/u }));

    await user.press(screen.getByRole('button', { name: '파티 만들기' }));

    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });
});

describe('the map behind another tab', () => {
  it('keeps the open card and a collapsed list across a visit to 파티', async () => {
    const user = await openMain();
    await press(user, FRIEND);
    await press(user, FOLD_FRIENDS);

    await user.press(screen.getByRole('tab', { name: /^파티/u }));
    await user.press(screen.getByRole('tab', { name: '지도' }));

    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();
    expect(screen.getByRole('button', { name: UNFOLD_FRIENDS })).toBeVisible();
  });
});

describe("a toast on a tab's screen", () => {
  it('sits 16 above the navigation on a tab other than 지도, as the frames draw it 96 from the bottom', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);

    // Without text recognition, as in the tests, it says "준비 중이에요".
    await user.press(screen.getByRole('button', { name: '이미지로 불러오기' }));

    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 96 });
  });

  it('sits where the main screen puts it once 지도 is shown again', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '행사' }));
    await user.press(screen.getByRole('tab', { name: '지도' }));

    await user.press(screen.getByRole('button', { name: '내 위치로 이동' }));
    expect(screen.getByText(FINDING_POSITION)).toBeVisible();

    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 158 });
  });
});

describe('the signed-in place', () => {
  it.each(['/party', '/events', '/me'])(
    'leads a User who is not signed in from %s to the sign-in screen',
    async (url) => {
      await startApp(url);
      await pass(600);

      expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
      expect(screen.queryByRole('tab', { name: '지도' })).toBeNull();
    },
  );
});

describe("Android's back button", () => {
  it('shows 지도 from another tab with nothing open', async () => {
    const pressBack = holdBackButton();
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));

    expect(await pressBack()).toBe(true);

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
  });

  it('leaves the app from 지도 with nothing open', async () => {
    const pressBack = holdBackButton();
    await openMain();

    expect(await pressBack()).toBe(false);
  });

  it("shows 지도 from another tab while the map's card is open, and closes the card after", async () => {
    const pressBack = holdBackButton();
    const user = await openMain();
    await press(user, FRIEND);
    await user.press(screen.getByRole('tab', { name: '행사' }));

    await pressBack();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();

    await pressBack();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});
