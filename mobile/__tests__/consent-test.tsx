// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-06, prompted by AhnJinYoung
import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { ONBOARDING } from './support/onboarding';
import { keep, readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const TITLE = '약관에 동의해 주세요';
const AGREE = '동의하고 시작';

type User = ReturnType<typeof userEvent.setup>;

async function press(user: User, name: string, wait = 100): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
  await pass(wait);
}

// The app in front of a User who has just signed in.
async function signInFresh(): Promise<User> {
  await startApp();
  await pass(600);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await press(user, SIGN_IN, 400);
  return user;
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the consent screen', () => {
  it('is shown after the first sign-in, before Onboarding, with the three documents', async () => {
    await signInFresh();

    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    expect(screen.getByText('SNU Now를 쓰려면 아래 약관에 동의해야 해요.')).toBeVisible();
    for (const name of ['이용약관', '개인정보 처리방침', '위치정보 이용약관']) {
      expect(screen.getByRole('link', { name })).toBeVisible();
    }
    expect(screen.queryByRole('header', { name: ONBOARDING })).toBeNull();
    expect((await readKept()).consented).toBe(false);
  });

  it('leads a new User on to Onboarding on "동의하고 시작", and the phone keeps the answer', async () => {
    const user = await signInFresh();
    await press(user, AGREE);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect((await readKept()).consented).toBe(true);
  });

  it('leads a User who finished Onboarding on to the main screen', async () => {
    await keep({ onboardingCompleted: true });
    const user = await signInFresh();
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();

    await press(user, AGREE, 1000);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });

  it('signs a User who does not agree out, back to the sign-in screen', async () => {
    const user = await signInFresh();
    await press(user, '로그아웃');

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(await readKept()).toMatchObject({ signedIn: false, consented: false });
  });
});

describe('consent, once on a phone', () => {
  it('is not asked again after a sign-out and a new sign-in', async () => {
    const user = await signInFresh();
    await press(user, AGREE);
    await press(user, '로그아웃');

    await press(user, SIGN_IN, 400);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });

  it('is asked after the loading screen of a signed-in User who has not agreed', async () => {
    await keep({ signedIn: true, onboardingCompleted: true });
    await startApp();
    await pass(600);
    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await press(user, AGREE, 1000);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });

  it('cannot be reached by a User who is not signed in', async () => {
    await startApp('/consent');
    await pass(600);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
  });
});

describe('a legal document', () => {
  it.each(['이용약관', '개인정보 처리방침', '위치정보 이용약관'])(
    'opens from the row "%s" on a screen of its own and closes back to consent',
    async (title) => {
      const user = await signInFresh();

      await user.press(screen.getByRole('link', { name: title }));
      await pass(100);
      expect(screen.getByRole('header', { name: title })).toBeVisible();
      expect(screen.getByText(`(${title} 내용이 들어갈 것)`)).toBeVisible();

      await press(user, '닫기');
      expect(screen.queryByRole('header', { name: title })).toBeNull();
      expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    },
  );

  it('can be read by its address alone, and closes to the start of the app', async () => {
    await startApp('/legal/privacy');
    expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await press(user, '닫기', 700);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it.each(['nothing', '__proto__', 'constructor'])('leads from the name "%s" to the start of the app', async (name) => {
    await startApp(`/legal/${name}`);
    await pass(700);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });
});
