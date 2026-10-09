// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen, shownAddress, startApp } from './support/app';
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

const NOT_READY = '준비 중이에요';
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
    ['내 정보', '내 정보'],
  ] as const)('%s opens its screen, with its slot as the current one', async (title, slot) => {
    const user = await openMain();

    await user.press(screen.getByRole('tab', { name: slot }));

    expect(screen.getByRole('header', { name: title })).toBeVisible();
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

  it('올리기 says that it is not ready, and opens nothing', async () => {
    const user = await openMain();

    await user.press(screen.getByRole('button', { name: '올리기' }));

    expect(screen.getByText(NOT_READY)).toBeVisible();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    await pass(2400);
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

  it('opens 파티 만들기 with "만들기"', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: /^파티/u }));

    await user.press(screen.getByRole('button', { name: '만들기' }));

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
    await user.press(screen.getByRole('tab', { name: '행사' }));

    await user.press(screen.getByRole('button', { name: '올리기' }));

    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 96 });
  });

  it('sits where the main screen puts it once 지도 is shown again', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('tab', { name: '행사' }));
    await user.press(screen.getByRole('tab', { name: '지도' }));

    await user.press(screen.getByRole('button', { name: '올리기' }));

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
