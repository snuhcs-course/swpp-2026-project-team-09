// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { screen, shownAddress } from './support/app';
import { holdBackButton } from './support/back';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, press } from './support/markers';
import { startFresh } from './support/mocks';

// The friend panel, the `MainFriends` frame, against the mocks: the frame's twelve Friends, four free, five in class,
// one moving and two with their location off.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SEARCH = '친구 검색';

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function openPanel(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
  return user;
}

// The Friends in the panel, by the names on their buttons, in the panel's order.
function shownFriends(): string[] {
  return screen
    .getAllByRole('button', { name: /님과 파티 만들기$/u })
    .map((button) => String(button.props.accessibilityLabel).replace('님과 파티 만들기', ''));
}

function sectionHeaders(): unknown[] {
  return screen
    .getAllByRole('header')
    .map((header) => header.props.children as unknown)
    .filter((words) => typeof words === 'string' && words.includes(' · '));
}

describe('the friend panel', () => {
  it('opens from the friend pill with every Friend, grouped by what they are doing', async () => {
    await openPanel();

    expect(screen.getByRole('header', { name: '친구 12' })).toBeVisible();
    expect(sectionHeaders()).toEqual(['공강 · 4', '수업 중 · 5', '이동 중 · 1', '위치 꺼짐 · 2']);
    expect(shownFriends()).toEqual([
      '김민준',
      '박지호',
      '이서연',
      '최유나',
      '강도윤',
      '윤태오',
      '정하은',
      '조수아',
      '한지민',
      '임채원',
      '서지우',
      '신예린',
    ]);
    expect(screen.getByText('위치 꺼짐 · 마지막 활동 2시간 전')).toBeVisible();
    expect(screen.getByText('심리학과')).toBeVisible();
  });

  it("closes with ✕, with a press on the scrim and with Android's back button", async () => {
    const pressBack = holdBackButton();
    const user = await openPanel();
    await user.press(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();

    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    await user.press(screen.getByRole('button', { name: '친구 패널 닫기' }));
    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();

    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    expect(await pressBack()).toBe(true);
    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();
  });
});

describe("Android's back button over the friend panel", () => {
  it('closes the panel before the card under it', async () => {
    const pressBack = holdBackButton();
    const user = await openMain();
    await press(user, FRIEND);
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));

    await pressBack();
    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();
    expect(screen.getByTestId('map-card')).toBeVisible();

    await pressBack();
    expect(screen.queryByTestId('map-card')).toBeNull();
  });
});

describe("the friend panel's search and chips", () => {
  it('filters by name and by department, and says so when nobody is found', async () => {
    const user = await openPanel();

    await user.type(screen.getByLabelText(SEARCH), '컴퓨터');
    expect(shownFriends()).toEqual(['김민준', '정하은']);
    expect(sectionHeaders()).toEqual(['공강 · 1', '수업 중 · 1']);

    await user.press(screen.getByRole('button', { name: '지우기' }));
    await user.type(screen.getByLabelText(SEARCH), '서지');
    expect(shownFriends()).toEqual(['서지우']);

    await user.type(screen.getByLabelText(SEARCH), '호');
    expect(screen.getByText('결과 없음')).toBeVisible();
  });

  it('filters by its chips, whose counts stay', async () => {
    const user = await openPanel();
    expect(screen.getByRole('button', { name: '전체 12' })).toBeSelected();

    await user.press(screen.getByRole('button', { name: '공강 4' }));

    expect(shownFriends()).toEqual(['김민준', '박지호', '이서연', '최유나']);
    for (const chip of ['전체 12', '수업 중 5', '이동 중 1', '위치 꺼짐 2']) {
      expect(screen.getByRole('button', { name: chip })).not.toBeSelected();
    }
  });

  it('hides a chip whose count is 0, except 전체', async () => {
    // Without the app's own statuses a Friend is free or has the location off.
    process.env.EXPO_PUBLIC_MOCK_EMPTY = 'listFriendStatuses';
    await openPanel();

    expect(screen.getByRole('button', { name: '전체 12' })).toBeVisible();
    expect(screen.getByRole('button', { name: '공강 10' })).toBeVisible();
    expect(screen.getByRole('button', { name: '위치 꺼짐 2' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^수업 중/u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^이동 중/u })).toBeNull();
  });
});

describe("the friend panel's footer and buttons", () => {
  it('counts the Friends the User sees now in its footer', async () => {
    await openPanel();

    expect(screen.getByText('친구 10명과 위치 공유 중')).toBeVisible();
  });

  it('closes and shows 내 정보 at its 위치 공유 card from "공유 설정"', async () => {
    const user = await openPanel();

    await user.press(screen.getByRole('link', { name: '공유 설정' }));

    expect(screen.queryByRole('header', { name: '친구 12' })).toBeNull();
    expect(screen.getByRole('tab', { name: '내 정보' })).toBeSelected();
    expect(shownAddress()).toBe('/me?show=sharing');
  });
});
