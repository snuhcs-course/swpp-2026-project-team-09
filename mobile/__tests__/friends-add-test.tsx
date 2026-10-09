// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { pass, screen } from './support/app';
import { openFriendScreen } from './support/friends';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// 친구 추가 against the mocks: the User's Friend ID, the lookup of another's and the Invite Link. 유지안 is no Friend,
// 한도경 sent the User a Friend Request, 김민준 is a Friend and the User sent one to 백승호.

jest.mock('expo-location');
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

type User = Awaited<ReturnType<typeof openMain>>;

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function find(user: User, friendId: string): Promise<void> {
  await user.type(screen.getByLabelText('친구 ID'), friendId);
  await user.press(screen.getByRole('button', { name: '찾기' }));
  await pass(500);
}

describe('내 친구 ID and the field', () => {
  it("shows the User's Friend ID and copies it", async () => {
    const user = await openFriendScreen('/me/friends/add');

    expect(screen.getByText('7KX2M9QD')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '복사' }));
    await pass(0);

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('7KX2M9QD');
    expect(screen.getByText('친구 ID를 복사했어요')).toBeVisible();
  });

  it('takes letters and digits in capitals, at most 8, and finds at 8', async () => {
    const user = await openFriendScreen('/me/friends/add');

    await user.type(screen.getByLabelText('친구 ID'), 'yj7a-4y6');
    expect(screen.getByLabelText('친구 ID').props.value).toBe('YJ7A4Y6');
    expect(screen.getByRole('button', { name: '찾기' })).toBeDisabled();
    await user.type(screen.getByLabelText('친구 ID'), 'zq');
    expect(screen.getByLabelText('친구 ID').props.value).toBe('YJ7A4Y6Z');
    expect(screen.getByRole('button', { name: '찾기' })).toBeEnabled();
  });
});

describe('친구 ID로 추가', () => {
  it('looks the owner up and sends a Friend Request, which waits', async () => {
    const user = await openFriendScreen('/me/friends/add');

    await find(user, 'YJ7A4Y6Z');
    expect(screen.getByText('유지안')).toBeVisible();
    expect(screen.getByText('경제학부')).toBeVisible();
    await user.press(screen.getByRole('button', { name: '추가' }));
    await pass(1000);

    expect(screen.getByRole('button', { name: '요청됨' })).toBeDisabled();
    expect(screen.getByText('유지안님에게 친구 요청을 보냈어요')).toBeVisible();
  });

  it('makes two Friends at once when the owner asked first', async () => {
    const user = await openFriendScreen('/me/friends/add');

    await find(user, 'HD3K8P2R');
    await user.press(screen.getByRole('button', { name: '추가' }));
    await pass(1000);

    expect(screen.getByText('한도경님과 친구가 됐어요')).toBeVisible();
  });
});

describe('the refusals of 친구 ID로 추가', () => {
  it.each([
    ['ZZZZZZZZ', false, '이 친구 ID를 가진 사람이 없어요'],
    ['7KX2M9QD', false, '내 친구 ID예요'],
    ['KM4J8QZA', true, '김민준님과는 이미 친구예요'],
    ['BS6H3W5X', true, '이미 친구 요청을 보냈어요'],
  ])('says why %s cannot be asked, until the field changes', async (friendId, found, words) => {
    const user = await openFriendScreen('/me/friends/add');

    await find(user, friendId);
    if (found) {
      await user.press(screen.getByRole('button', { name: '추가' }));
      await pass(1000);
    }

    expect(screen.getByText(words)).toBeVisible();
    await user.type(screen.getByLabelText('친구 ID'), '{Backspace}');
    expect(screen.queryByText(words)).toBeNull();
  });

  it('says so when the lookup gets no answer', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'findFriendId';
    const user = await openFriendScreen('/me/friends/add');

    await find(user, 'YJ7A4Y6Z');

    expect(screen.getByText('연결하지 못했어요. 다시 시도해 주세요')).toBeVisible();
  });
});

describe('초대 링크로 추가', () => {
  it("creates an Invite Link and opens the share sheet with the link's address", async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const user = await openFriendScreen('/me/friends/add');

    await user.press(screen.getByRole('button', { name: '초대 링크 보내기' }));
    await pass(500);

    expect(share).toHaveBeenCalledWith({ message: 'SNU Now에서 친구 해요! https://snunow.example/invite/invite-1' });
    expect(screen.getByText('링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요')).toBeVisible();
  });

  it('says so when the Invite Link cannot be made', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'createInviteLink';
    const share = jest.spyOn(Share, 'share');
    const user = await openFriendScreen('/me/friends/add');

    await user.press(screen.getByRole('button', { name: '초대 링크 보내기' }));
    await pass(500);

    expect(share).not.toHaveBeenCalled();
    expect(screen.getByText('초대 링크를 만들지 못했어요')).toBeVisible();
  });

  it('opens from the friend panel and goes back to the map', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    await user.press(screen.getByRole('button', { name: '친구 추가' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '친구 추가' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    expect(screen.queryByRole('header', { name: '친구 추가' })).toBeNull();
  });
});
