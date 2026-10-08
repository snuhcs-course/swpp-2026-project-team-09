import { pass, screen } from './support/app';
import { openFriendScreen } from './support/friends';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';

// 친구 요청 against the mocks: three Friend Requests received (한도경, 김하늘, 박서준) and one sent (백승호).

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('친구 요청', () => {
  it('lists the requests received and sent, and goes back to the list', async () => {
    const user = await openFriendScreen('/me/friends');
    await user.press(screen.getByRole('button', { name: '친구 요청 3' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '친구 요청 3' })).toBeVisible();
    expect(screen.getByText('수락하면 서로의 위치를 지도에서 볼 수 있어요')).toBeVisible();
    expect(screen.getByRole('header', { name: '받은 요청 · 3' })).toBeVisible();
    expect(screen.getByRole('header', { name: '보낸 요청 · 1' })).toBeVisible();
    expect(screen.getByText('백승호')).toBeVisible();

    await user.press(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.getAllByRole('header', { name: '친구 12' })).toHaveLength(2);
  });

  it('says so with no request received', async () => {
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listFriendRequests';
    await openFriendScreen('/me/friends/requests');

    expect(screen.getByText('받은 요청이 없어요')).toBeVisible();
  });
});

describe('the answers of 친구 요청', () => {
  it('accepts a request with a toast', async () => {
    const user = await openFriendScreen('/me/friends/requests');

    await user.press(screen.getAllByRole('button', { name: '수락' })[0]);
    await pass(1000);

    expect(screen.getByText('한도경님과 친구가 됐어요')).toBeVisible();
    expect(screen.getByRole('header', { name: '받은 요청 · 2' })).toBeVisible();
  });

  it('declines a request without a toast', async () => {
    const user = await openFriendScreen('/me/friends/requests');

    await user.press(screen.getAllByRole('button', { name: '거절' })[0]);
    await pass(1000);

    expect(screen.queryByText('한도경')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('cancels a sent request with a toast, and leaves out the empty section', async () => {
    const user = await openFriendScreen('/me/friends/requests');

    await user.press(screen.getByRole('button', { name: '요청 취소' }));
    await pass(1000);

    expect(screen.getByText('친구 요청을 취소했어요')).toBeVisible();
    expect(screen.queryByRole('header', { name: /^보낸 요청/u })).toBeNull();
  });
});
