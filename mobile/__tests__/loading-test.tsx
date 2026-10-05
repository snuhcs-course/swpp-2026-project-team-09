import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { keep } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
}));

const ANSWERS = {
  name: '홍길동',
  department: '컴퓨터공학부',
  admissionYear: 2022,
  hashtags: [],
  courseLevel: 'undergraduate',
  gender: null,
} as const;

async function keepSignedIn(onboardingCompleted: boolean): Promise<void> {
  await keep({
    signedIn: true,
    onboardingCompleted,
    suggestion: onboardingCompleted ? null : { name: '홍길동', department: null },
    answers: onboardingCompleted ? { ...ANSWERS, hashtags: [] } : null,
  });
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the loading screen', () => {
  it('shows the wordmark and a bar that fills while the app gets ready', async () => {
    await keepSignedIn(true);
    await startApp();

    expect(screen.getByRole('header', { name: 'SNU Now' })).toBeVisible();
    expect(screen.getByText('관악캠퍼스의 지금')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '불러오는 중' })).toHaveAccessibilityValue({ now: 0 });
    expect(screen.getByText('지도')).toBeVisible();

    // The Lobby's mock answers after 300 ms: until then the bar stops short of the end.
    await pass(250);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 25 });
    await pass(100);
    expect(screen.getByText('친구')).toBeVisible();
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('stays for half a second even when the app is ready at once', async () => {
    await startApp();

    await pass(450);
    expect(screen.getByText('완료')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();

    await pass(50);
    expect(screen.queryByText('관악캠퍼스의 지금')).toBeNull();
  });
});

describe('after the loading screen', () => {
  it('shows the sign-in screen to a User who is not signed in', async () => {
    await startApp();
    await pass(600);

    expect(screen.getByRole('header', { name: '로그인' })).toBeVisible();
  });

  it('shows Onboarding to a User who signed in and did not finish it', async () => {
    await keepSignedIn(false);
    await startApp();
    await pass(600);

    expect(screen.getByRole('header', { name: '온보딩' })).toBeVisible();
  });

  it('shows the main screen to a User who finished Onboarding, with the Lobby fetched', async () => {
    await keepSignedIn(true);
    await startApp();
    await pass(1000);

    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
  });
});

describe('a failure while loading', () => {
  it('says so, and starts again on "다시 시도"', async () => {
    await keepSignedIn(true);
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'enterLobby';
    await startApp();
    // The Lobby is asked once more before the failure is told.
    await pass(3000);

    expect(screen.getByText('불러오지 못했어요')).toBeVisible();
    expect(screen.queryByRole('progressbar')).toBeNull();

    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_MOCK_FAIL');
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole('button', { name: '다시 시도' }));
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ now: 0 });

    await pass(1000);
    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
  });
});

describe("a screen that is not the User's", () => {
  it('leads a User who is not signed in from the main screen to the sign-in screen', async () => {
    await startApp('/main');
    await pass(600);

    expect(screen.getByRole('header', { name: '로그인' })).toBeVisible();
    expect(screen.queryByRole('header', { name: '메인' })).toBeNull();
  });

  it('leads a signed-in User from the sign-in screen to the main screen', async () => {
    await keepSignedIn(true);
    await startApp('/sign-in');
    await pass(1000);

    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
    expect(screen.queryByRole('header', { name: '로그인' })).toBeNull();
  });

  it('follows a sign-in, Onboarding and a sign-out without the loading screen again', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await startApp();
    await pass(600);

    await user.press(screen.getByRole('button', { name: '로그인 (임시)' }));
    await pass(400);
    expect(screen.getByRole('header', { name: '온보딩' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '저장 (임시)' }));
    await pass(400);
    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();

    await user.press(screen.getByRole('button', { name: '로그아웃 (임시)' }));
    await pass(100);
    expect(screen.getByRole('header', { name: '로그인' })).toBeVisible();
    expect(screen.queryByText('관악캠퍼스의 지금')).toBeNull();
  });
});
