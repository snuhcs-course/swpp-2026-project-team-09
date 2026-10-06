import { pass, screen, shownAddress } from './support/app';
import { FRIEND_PILL } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';
import { readKept } from '@/storage/kept';

// 내 정보, the `Profile` frame, against the mocks: the profile Onboarding saved, the frame's four classes on Thursday
// 1 October 2026, the frame's twelve Friends and the User's two Quests that are not classes.

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
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// The dialog's button, after the screen's button of the same name.
function dialogButton(name: string): ReturnType<typeof screen.getByRole> {
  const button = screen.getAllByRole('button', { name }).at(-1);
  if (button === undefined) {
    throw new Error(`No button ${name}`);
  }
  return button;
}

async function openMe(admissionYear: number | null = 2022): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain({
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear,
      hashtags: [],
      courseLevel: 'undergraduate',
      gender: null,
    },
  });
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

describe('the profile card', () => {
  it('shows the name, the department with the admission year, and the account', async () => {
    await openMe();

    expect(screen.getByText('홍길동')).toBeVisible();
    expect(screen.getByText('컴퓨터공학부 · 22학번')).toBeVisible();
    expect(screen.getByText('SNU 계정 인증됨')).toBeVisible();
    expect(screen.getByRole('button', { name: '프로필 편집' })).toBeVisible();
  });

  it('shows the department alone without an admission year', async () => {
    await openMe(null);

    expect(screen.getByText('컴퓨터공학부')).toBeVisible();
    expect(screen.queryByText(/학번/u)).toBeNull();
  });
});

describe('the week', () => {
  it('draws a block for each time from Monday to Friday, coloured by the class', async () => {
    await openMe();

    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
    expect(screen.getByLabelText('월요일 10:30–12:00 운영체제, 301동')).toHaveStyle({ backgroundColor: '#001A72' });
    expect(screen.getByLabelText('화요일 09:30–11:00 알고리즘, 302-208')).toHaveStyle({ backgroundColor: '#0E7383' });
    expect(screen.getByLabelText('화요일 15:30–17:00 확률통계, 500동')).toHaveStyle({ backgroundColor: '#865600' });
    expect(screen.getByLabelText('금요일 14:00–15:15 자료구조, 301-118')).toHaveStyle({ backgroundColor: '#6B46C1' });
    expect(screen.getAllByText('알고리즘\n302-208')).toHaveLength(2);
  });

  it("marks today's column, Thursday, in navy", async () => {
    await openMe();

    expect(screen.getByText('목')).toHaveStyle({ color: '#001A72', fontFamily: 'Pretendard-Bold' });
    expect(screen.getByText('수')).toHaveStyle({ color: '#555C74' });
  });

  it('shows the error state inside the card when the classes cannot be read, and asks again', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listClasses';
    const user = await openMe();
    await pass(2000);

    expect(screen.getByText('불러오지 못했어요')).toBeVisible();
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_MOCK_FAIL');
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    await pass(500);
    expect(screen.getAllByTestId('class-block')).toHaveLength(7);
  });

  it.each(['직접 입력', '이미지로 불러오기', '빈 시간 말하기'])('says that "%s" is not ready', async (tile) => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: tile }));

    expect(screen.getByTestId('toast-layer')).toHaveTextContent(NOT_READY);
  });
});

describe('the 위치 공유 card', () => {
  it('has the Master Switch with the number of Friends, and no 비공개 구역', async () => {
    await openMe();

    expect(screen.getByRole('header', { name: '위치 공유' })).toBeVisible();
    expect(screen.getByRole('switch', { name: '친구와 위치 공유' })).not.toBeChecked();
    expect(screen.getByText('12명')).toBeVisible();
    expect(screen.queryByText('비공개 구역 관리')).toBeNull();
  });

  it('is outlined when the friend panel\'s "공유 설정" shows it, and the outline goes after 1.2 s', async () => {
    const user = await openMain();
    await user.press(screen.getByRole('button', { name: FRIEND_PILL }));
    await pass(300);

    await user.press(screen.getByRole('link', { name: '공유 설정' }));
    await pass(500);

    expect(screen.getByRole('tab', { name: '내 정보' })).toBeSelected();
    expect(screen.getByTestId('sharing-outline')).toBeOnTheScreen();
    await pass(1000);
    expect(screen.queryByTestId('sharing-outline')).toBeNull();
    expect(shownAddress()).not.toContain('sharing');
  });
});

describe('the activity rows', () => {
  it('say that 친구 관리 is not ready', async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '친구 관리 12' }));

    expect(screen.getByTestId('toast-layer')).toHaveTextContent(NOT_READY);
  });

  it("open 파티 at 내 파티 from 참여 중인 파티, which counts the User's Quests that are not classes", async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '참여 중인 파티 2' }));

    expect(screen.getByRole('tab', { name: '내 파티' })).toBeSelected();
    expect(shownAddress()).toBe('/party?tab=mine');
  });

  it('open the Quest list on the whole screen from 내 퀘스트', async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '내 퀘스트' }));
    await pass(500);

    expect(screen.getByRole('header', { name: '퀘스트 3' })).toBeVisible();
  });

  it('have no 관심 행사 and no 알림 설정', async () => {
    await openMe();

    expect(screen.queryByText('관심 행사')).toBeNull();
    expect(screen.queryByText('알림 설정')).toBeNull();
  });
});

describe('로그아웃', () => {
  it('asks first, and stays on 내 정보 after 취소', async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '로그아웃' }));
    expect(screen.getByRole('header', { name: '로그아웃할까요?' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('header', { name: '로그아웃할까요?' })).toBeNull();
    expect(screen.getByRole('header', { name: '내 정보' })).toBeVisible();
    expect((await readKept()).signedIn).toBe(true);
  });

  it('signs out and shows the sign-in screen once confirmed', async () => {
    const user = await openMe();

    await user.press(screen.getByRole('button', { name: '로그아웃' }));
    await user.press(dialogButton('로그아웃'));
    await pass(500);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect((await readKept()).signedIn).toBe(false);
  });
});
