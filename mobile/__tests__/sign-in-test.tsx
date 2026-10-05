import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import * as auth from '@/auth/sign-in';
import { keep } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';

type User = ReturnType<typeof userEvent.setup>;

// The app, past the loading screen, in front of a User who is not signed in.
async function openSignIn(ending?: string): Promise<User> {
  if (ending !== undefined) {
    process.env.EXPO_PUBLIC_SIGN_IN_ENDING = ending;
  }
  await startApp();
  await pass(600);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

async function pressSignIn(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the sign-in screen', () => {
  it('shows the one button, what it is for and the documents agreed to', async () => {
    await openSignIn();

    expect(screen.getByText('SNU Now')).toBeVisible();
    expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    expect(screen.getByText('@snu.ac.kr')).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
    expect(screen.queryByRole('alert')).toBeNull();
    for (const name of ['이용약관', '개인정보 처리방침', '위치정보 이용']) {
      expect(screen.getByRole('link', { name })).toBeVisible();
    }
  });

  it('checks the account after a press and takes no second press meanwhile', async () => {
    const signIn = jest.spyOn(auth, 'signIn');
    const user = await openSignIn();

    await pressSignIn(user);
    expect(screen.getByRole('header', { name: '학교 계정 확인 중…' })).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeBusy();
    expect(screen.getByTestId('sign-in-spinner')).toBeVisible();

    await pressSignIn(user);
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});

describe('how a sign-in ends', () => {
  it('leads a User who signed in to Onboarding', async () => {
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: '온보딩' })).toBeVisible();
    expect(screen.queryByRole('button', { name: SIGN_IN })).toBeNull();
  });

  it('leads a User who finished Onboarding on this phone to the main screen', async () => {
    await keep({ onboardingCompleted: true });
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(1000);

    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
  });

  it('refuses an account outside SNU and says which accounts may sign in', async () => {
    const user = await openSignIn('not-snu-account');
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: '로그인하지 못했어요' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('@snu.ac.kr 계정만 가능해요');
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
  });

  it('returns to the default state when the User closed the sheet', async () => {
    const user = await openSignIn('cancelled');
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
  });
});

describe('a sign-in that fails for another reason', () => {
  it('asks to try again later', async () => {
    const user = await openSignIn('failed');
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: '로그인하지 못했어요' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요');
  });

  it('says the same when the sign-in itself breaks', async () => {
    jest.spyOn(auth, 'signIn').mockRejectedValue(new Error('no network'));
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요');
  });
});

describe('a refused sign-in', () => {
  it('is tried again with a press, and then succeeds', async () => {
    const user = await openSignIn('not-snu-account');
    await pressSignIn(user);
    await pass(400);
    expect(screen.getByRole('alert')).toBeVisible();

    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_SIGN_IN_ENDING');
    await pressSignIn(user);
    expect(screen.getByRole('header', { name: '학교 계정 확인 중…' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();

    await pass(400);
    expect(screen.getByRole('header', { name: '온보딩' })).toBeVisible();
  });
});

describe('a legal document', () => {
  it.each([
    ['이용약관', '이용약관'],
    ['개인정보 처리방침', '개인정보 처리방침'],
    ['위치정보 이용', '위치정보 이용약관'],
  ])('opens from "%s" on a screen of its own and closes back to the sign-in screen', async (link, title) => {
    const user = await openSignIn();

    await user.press(screen.getByRole('link', { name: link }));
    await pass(100);
    expect(screen.getByRole('header', { name: title })).toBeVisible();
    expect(screen.getByText(`(${title} 내용이 들어갈 것)`)).toBeVisible();

    await user.press(screen.getByRole('button', { name: '닫기' }));
    await pass(100);
    expect(screen.queryByRole('header', { name: title })).toBeNull();
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it('can be read by its address alone, and closes to the start of the app', async () => {
    await startApp('/legal/privacy');
    expect(screen.getByRole('header', { name: '개인정보 처리방침' })).toBeVisible();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(screen.getByRole('button', { name: '닫기' }));
    await pass(700);
    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });
});

describe('a legal document that does not exist', () => {
  it.each(['nothing', '__proto__', 'constructor'])('leads from the name "%s" to the start of the app', async (name) => {
    await startApp(`/legal/${name}`);
    await pass(700);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
  });

  it('takes no press on a link while the account is checked', async () => {
    const user = await openSignIn();

    await user.press(screen.getByRole('button', { name: SIGN_IN }));
    expect(screen.getByRole('link', { name: '이용약관' })).toBeDisabled();

    await pass(400);
    expect(screen.queryByRole('header', { name: '이용약관' })).toBeNull();
  });
});
