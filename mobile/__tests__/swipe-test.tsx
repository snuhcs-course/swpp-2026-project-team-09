/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-23  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { act, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen, shownAddress } from './support/app';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { hasGesture, swipe, WIDTH } from './support/swipe';

// The sideways swipes (P20 ticket 06): from the left edge, back; anywhere else in the 파티 tab, between its tabs.
// The gestures are driven by their test ids, so a test gives where the finger starts and how far it moves.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const TAB_SWIPE = 'party-tab-swipe';
const LEFT = { fromX: 200, dx: -120 };
const RIGHT = { fromX: 200, dx: 120 };

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("the 파티 tab's swipe", () => {
  it('moves to the next tab on a swipe left, and the tabs bar and the address follow', async () => {
    await openAt('/party');

    await swipe(TAB_SWIPE, LEFT);
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=mine');

    await swipe(TAB_SWIPE, LEFT);
    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=invites');
  });

  it('moves to the previous tab on a swipe right', async () => {
    await openAt('/party?tab=invites');

    await swipe(TAB_SWIPE, RIGHT);
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();

    await swipe(TAB_SWIPE, RIGHT);
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=find');
  });

  it('stays at 찾기 on a swipe right and at 초대 on a swipe left', async () => {
    await openAt('/party');
    await swipe(TAB_SWIPE, RIGHT);
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();

    await act(() => {
      router.setParams({ tab: 'invites' });
    });
    await swipe(TAB_SWIPE, LEFT);
    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=invites');
  });

  it('moves on a short swipe that is fast, and not on one that is short and slow', async () => {
    await openAt('/party');

    await swipe(TAB_SWIPE, { fromX: 200, dx: -30, vx: -100 });
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();

    await swipe(TAB_SWIPE, { fromX: 200, dx: -30, vx: -900 });
    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
  });
});

describe("what the 파티 tab's swipe leaves to others", () => {
  it('does not change the tab on a scroll up or down', async () => {
    await openAt('/party');

    await swipe(TAB_SWIPE, { fromX: 200, dx: -8, dy: -300 });

    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
  });

  it('leaves a swipe that starts at the left edge to the edge, which shows 지도', async () => {
    await openAt('/party');

    await swipe(TAB_SWIPE, { fromX: 12, dx: 300 });
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
    expect(shownAddress()).toBe('/party');

    await swipe('edge-back-party', { fromX: 12, dx: WIDTH * 0.6 });
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(shownAddress()).toBe('/main');
  });

  it('still changes the tab on a press', async () => {
    const user = await openAt('/party');

    await user.press(screen.getByRole('tab', { name: /^초대/u }));

    expect(screen.getByRole('tab', { name: /^초대/u })).toBeSelected();
  });

  it('turns the official banner on a swipe over it, and leaves the tab', async () => {
    await openAt('/party');
    const banner = within(screen.getByLabelText('공식 모집'));
    expect(banner.getByLabelText('1 / 2')).toBeVisible();

    await swipe('official-banner-swipe', { fromX: 200, dx: -60 });
    expect(banner.getByLabelText('2 / 2')).toBeVisible();

    await swipe('official-banner-swipe', { fromX: 200, dx: 60 });
    expect(banner.getByLabelText('1 / 2')).toBeVisible();
    expect(screen.getByRole('tab', { name: '찾기' })).toBeSelected();
  });
});

describe('the swipe from the left edge on a tab', () => {
  it.each([
    ['파티', '/party', 'edge-back-party'],
    ['행사', '/events', 'edge-back-events'],
    ['내 정보', '/me', 'edge-back-me'],
  ] as const)('on %s shows 지도 past half the screen', async (_title, address, testId) => {
    await openAt(address);

    await swipe(testId, { fromX: 10, dx: WIDTH * 0.6 });

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(shownAddress()).toBe('/main');
  });

  it.each([
    ['파티', /^파티/u, '/party', 'edge-back-party'],
    ['행사', '행사', '/events', 'edge-back-events'],
    ['내 정보', '내 정보', '/me', 'edge-back-me'],
  ] as const)('on %s leaves the tab as it was short of it', async (_title, slot, address, testId) => {
    await openAt(address);

    await swipe(testId, { fromX: 10, dx: WIDTH * 0.3 });

    expect(screen.getByRole('tab', { name: slot })).toBeSelected();
    expect(shownAddress()).toBe(address);
  });

  it('goes on a short swipe that is fast', async () => {
    await openAt('/events');

    await swipe('edge-back-events', { fromX: 10, dx: WIDTH * 0.3, vx: 1500 });

    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
  });

  it('has nothing on 지도, whose edges are the map’s', async () => {
    await openMain();

    expect(hasGesture('edge-back-main')).toBe(false);
    expect(hasGesture('edge-close')).toBe(false);
  });
});

describe('the swipe from the left edge over a side panel or a bottom sheet', () => {
  it('closes the friend panel on 지도, and leaves 지도', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    expect(screen.getByLabelText('친구')).toBeVisible();

    await swipe('edge-close', { fromX: 10, dx: WIDTH * 0.6 });
    await pass(400);

    expect(screen.queryByLabelText('친구')).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeSelected();
    expect(hasGesture('edge-close')).toBe(false);
  });

  it('leaves the panel open short of half the screen', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));

    await swipe('edge-close', { fromX: 10, dx: WIDTH * 0.3 });
    await pass(400);

    expect(screen.getByLabelText('친구')).toBeVisible();
  });

  it('closes a bottom sheet and stays on the screen under it', async () => {
    const user = await openAt('/party-form');
    await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
    expect(screen.getByLabelText('게시판 고르기')).toBeVisible();

    await swipe('edge-close', { fromX: 10, dx: WIDTH * 0.6 });
    await pass(400);

    expect(screen.queryByLabelText('게시판 고르기')).toBeNull();
    expect(screen.getByRole('header', { name: '파티 만들기' })).toBeVisible();
  });

  it('is not over an open card on the map, which leaves the map its edge', async () => {
    const user = await openMain();
    await press(user, FRIEND);
    expect(screen.getByRole('header', { name: '김민준' })).toBeVisible();

    expect(hasGesture('edge-close')).toBe(false);
  });
});
