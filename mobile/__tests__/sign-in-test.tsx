import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { ONBOARDING } from './support/onboarding';
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
  it('shows the one button and what it is for', async () => {
    await openSignIn();

    expect(screen.getByText('SNU Now')).toBeVisible();
    expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    expect(screen.getByText('@snu.ac.kr')).toBeVisible();
    expect(screen.getByRole('button', { name: SIGN_IN })).not.toBeBusy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
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
  it('leads a User who signed in for the first time on this phone to the consent screen', async () => {
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: '약관에 동의해 주세요' })).toBeVisible();
    expect(screen.queryByRole('button', { name: SIGN_IN })).toBeNull();
  });

  it('leads a User who agreed before to Onboarding', async () => {
    await keep({ consented: true });
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(400);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('button', { name: SIGN_IN })).toBeNull();
  });

  it('leads a User who finished Onboarding on this phone to the main screen', async () => {
    await keep({ consented: true, onboardingCompleted: true });
    const user = await openSignIn();
    await pressSignIn(user);
    await pass(1000);

    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
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
    expect(screen.getByRole('header', { name: '약관에 동의해 주세요' })).toBeVisible();
  });
});
