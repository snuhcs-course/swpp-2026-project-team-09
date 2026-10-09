/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen } from './support/app';
import { friendRows, openFriendScreen } from './support/friends';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND } from './support/markers';
import { startFresh } from './support/mocks';

// 친구 관리 against the mocks: the frame's twelve Friends, ten of whom the User sees.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const MIN_JUN_SWITCH = '김민준님과 위치 공유';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function turn(on: boolean): Promise<void> {
  await fireEvent(screen.getByRole('switch', { name: MIN_JUN_SWITCH }), 'valueChange', on);
}

describe('친구 관리', () => {
  it('lists the Friends by name with 친구 추가 and the entry to 친구 요청', async () => {
    await openFriendScreen('/me/friends');

    expect(screen.getAllByRole('header', { name: '친구 12' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: '친구 추가' })).toBeVisible();
    expect(screen.getByRole('button', { name: '친구 요청 3' })).toBeVisible();
    expect(friendRows()).toHaveLength(12);
    expect(friendRows()[0]).toBe('강도윤');
    expect(screen.getByText('심리학과 · 위치 꺼짐')).toBeVisible();
    expect(screen.getByText('위치 공유를 끄면 서로의 위치가 보이지 않아요')).toBeVisible();
  });

  it('searches by name and department, and says so when nobody is found', async () => {
    const user = await openFriendScreen('/me/friends');

    await user.type(screen.getByLabelText('친구 검색'), '컴퓨터');
    expect(friendRows()).toEqual(['김민준', '정하은']);

    await user.type(screen.getByLabelText('친구 검색'), '없는');
    expect(screen.getByText('결과 없음')).toBeVisible();
  });
});

describe('친구 관리 when empty or failing', () => {
  it('says so when the User has no Friend', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listFriends';
    await openFriendScreen('/me/friends');

    expect(screen.getByText('아직 친구가 없어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '친구 추가' })).toBeVisible();
  });

  it('shows the shared states while loading and after a failure', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listFriends';
    await openMain();
    await act(() => {
      router.push('/me/friends');
    });
    expect(screen.getAllByLabelText('불러오는 중').length).toBeGreaterThan(0);

    await pass(2000);
    expect(screen.getAllByText('불러오지 못했어요').length).toBeGreaterThan(0);
  });
});

describe("친구 관리's switches", () => {
  it("turns a friendship's sharing off and on, and the Friend's Avatar goes and comes", async () => {
    await openFriendScreen('/me/friends');
    expect(screen.getByRole('switch', { name: MIN_JUN_SWITCH })).toBeChecked();

    await turn(false);
    expect(screen.getByRole('switch', { name: MIN_JUN_SWITCH })).not.toBeChecked();
    await pass(1000);
    expect(screen.getByText('컴퓨터공학부 · 위치 꺼짐')).toBeVisible();
    // The map lies under this screen.
    expect(screen.queryByRole('button', { name: FRIEND, hidden: true })).toBeNull();

    await turn(true);
    await pass(1000);
    expect(screen.getByRole('switch', { name: MIN_JUN_SWITCH })).toBeChecked();
    expect(screen.getByRole('button', { name: FRIEND, hidden: true })).toBeTruthy();
  });

  it('turns the switch back and says so when the change fails', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'setFriendSharing';
    await openFriendScreen('/me/friends');

    await turn(false);
    await pass(1000);

    expect(screen.getByRole('switch', { name: MIN_JUN_SWITCH })).toBeChecked();
    expect(screen.getByText('위치 공유를 바꾸지 못했어요')).toBeVisible();
  });
});

describe('친구 끊기', () => {
  it('ends a friendship once it is confirmed, and the Friend leaves the list, the panel and the map', async () => {
    const user = await openFriendScreen('/me/friends');

    await user.press(screen.getByRole('button', { name: '김민준' }));
    await user.press(screen.getByRole('button', { name: '친구 끊기' }));
    expect(screen.getByRole('header', { name: '김민준님과 친구를 끊을까요?' })).toBeVisible();
    expect(screen.getByText('서로 위치가 보이지 않고, 답을 기다리는 파티 초대도 취소돼요.')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '끊기' }));
    await pass(1000);

    expect(screen.getByText('김민준님과 친구를 끊었어요')).toBeVisible();
    expect(friendRows()).not.toContain('김민준');
    expect(screen.queryByRole('button', { name: FRIEND, hidden: true })).toBeNull();
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    expect(screen.getByRole('header', { name: '친구 11' })).toBeVisible();
  });

  it('keeps the friendship when the dialog is cancelled', async () => {
    const user = await openFriendScreen('/me/friends');

    await user.press(screen.getByRole('button', { name: '김민준' }));
    await user.press(screen.getByRole('button', { name: '친구 끊기' }));
    await user.press(screen.getByRole('button', { name: '취소' }));
    await pass(1000);

    expect(screen.queryByRole('header', { name: '김민준님과 친구를 끊을까요?' })).toBeNull();
    expect(friendRows()).toContain('김민준');
  });
});
