/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { pass, screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';

// On Android the screens above the tabs stand in the JS stack, whose swipe from the left edge follows the finger
// (P20 ticket 06). The other tests run as iOS, on the native stack; these open and close screens on the JS one.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the screens above the tabs on Android', () => {
  it.each([
    ["the screen's 뒤로", 'screen'],
    ["Android's back button", 'android'],
  ])('open 참여 중인 파티 from 내 정보, and return to it by %s', async (_name, way) => {
    const pressBack = holdBackButton();
    const user = await openAt('/me');
    await user.press(screen.getByRole('button', { name: /^참여 중인 파티/u }));
    await pass(500);
    expect(shownAddress()).toBe('/me/parties');
    expect(screen.getByRole('header', { name: '참여 중인 파티' })).toBeVisible();

    if (way === 'screen') {
      await user.press(screen.getByRole('button', { name: '뒤로' }));
    } else {
      expect(await pressBack()).toBe(true);
    }
    await pass(500);

    expect(shownAddress()).toBe('/me');
    expect(screen.getByRole('tab', { name: '내 정보' })).toBeSelected();
  });

  it('opens a screen from the bottom and closes it with the back button', async () => {
    const pressBack = holdBackButton();
    await openAt('/events');
    await act(() => {
      router.push('/menus');
    });
    await pass(500);
    expect(shownAddress()).toBe('/menus');

    expect(await pressBack()).toBe(true);
    await pass(500);

    expect(shownAddress()).toBe('/events');
    expect(screen.getByRole('tab', { name: '행사' })).toBeSelected();
  });
});
