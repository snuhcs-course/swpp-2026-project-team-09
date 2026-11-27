/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { fireEvent, userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import { ONBOARDING } from './support/onboarding';
import { CONSENT_NOT_SAVED, USAGE_ITEM } from '@/screens/consent-screen';
import { keep, readKept } from '@/storage/kept';

// The consent screen's choice on usage data in the mock build (P08 ticket 11), which keeps the account's consent on
// the phone in place of the main server (`mockAccountConsent`).

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const TITLE = '약관에 동의해 주세요';
const AGREE = '동의하고 시작';
const SWITCH = '사용 기록 보내기';
const NO_CONSENT = { version: null, usage: null };

type User = ReturnType<typeof userEvent.setup>;

async function press(user: User, name: string, wait = 400): Promise<void> {
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

// 로그아웃 on 내 정보, confirmed in its dialog.
async function signOutOnMe(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: '로그아웃' }));
  const confirm = screen.getAllByRole('button', { name: '로그아웃' }).at(-1);
  if (confirm === undefined) {
    throw new Error('The dialog has no 로그아웃');
  }
  await user.press(confirm);
  await pass(500);
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the item on usage data', () => {
  it('offers usage data below the documents, not ticked', async () => {
    const user = await signInFresh();

    expect(screen.getByRole('checkbox', { name: USAGE_ITEM.label })).not.toBeChecked();
    expect(screen.getByText(USAGE_ITEM.sentence)).toBeVisible();
    expect(screen.getByRole('link', { name: USAGE_ITEM.link })).toBeVisible();

    await user.press(screen.getByRole('checkbox', { name: USAGE_ITEM.label }));
    expect(screen.getByRole('checkbox', { name: USAGE_ITEM.label })).toBeChecked();
    await user.press(screen.getByRole('checkbox', { name: USAGE_ITEM.label }));
    expect(screen.getByRole('checkbox', { name: USAGE_ITEM.label })).not.toBeChecked();
  });
});

describe('when the screen asks', () => {
  it('is not asked of a User who agreed on this phone before, whose consent is kept with usage data off', async () => {
    await keep({
      signedIn: true,
      consented: true,
      onboardingCompleted: true,
      answers: { name: '홍길동', department: '컴퓨터공학부', admissionYear: 2022, hashtags: [], gender: null },
    });
    await startApp();
    await pass(1000);

    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect(await readKept()).toMatchObject({
      consented: false,
      consent: { version: 1, usage: false },
      mockAccountConsent: { version: 1, usage: false },
    });
  });

  it('is not asked at a start when the copy holds version 1', async () => {
    await keep({
      signedIn: true,
      onboardingCompleted: true,
      answers: { name: '홍길동', department: '컴퓨터공학부', admissionYear: 2022, hashtags: [], gender: null },
      consent: { version: 1, usage: false },
    });
    await startApp();
    await pass(1000);

    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
  });
});

describe('the mock build', () => {
  it('keeps the consent with the ticked box on the phone in place of the account', async () => {
    const user = await signInFresh();
    await user.press(screen.getByRole('checkbox', { name: USAGE_ITEM.label }));
    await press(user, AGREE);

    expect(await readKept()).toMatchObject({
      consent: { version: 1, usage: true },
      mockAccountConsent: { version: 1, usage: true },
    });
  });

  it('keeps the User on the screen when the consent was not kept, and agrees on a second press', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'agreeToConsent';
    const user = await signInFresh();
    await press(user, AGREE);

    expect(screen.getByRole('header', { name: TITLE })).toBeVisible();
    expect(screen.getByText(CONSENT_NOT_SAVED)).toBeVisible();
    expect(await readKept()).toMatchObject({ consent: NO_CONSENT, mockAccountConsent: NO_CONSENT });

    delete process.env.EXPO_PUBLIC_MOCK_FAIL;
    await press(user, AGREE);
    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
  });
});

describe("the mock build's switch in 내 정보", () => {
  it('keeps the choice of "사용 기록 보내기" on the phone, and it holds after a sign-out and a sign-in', async () => {
    await keep({ onboardingCompleted: true });
    const user = await signInFresh();
    await user.press(screen.getByRole('checkbox', { name: USAGE_ITEM.label }));
    await press(user, AGREE, 1000);
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    expect(screen.getByRole('switch', { name: SWITCH })).toBeChecked();

    await fireEvent(screen.getByRole('switch', { name: SWITCH }), 'valueChange', false);
    await pass(400);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
    expect(await readKept()).toMatchObject({
      consent: { version: 1, usage: false },
      mockAccountConsent: { version: 1, usage: false },
    });

    await signOutOnMe(user);
    await press(user, SIGN_IN, 1000);
    expect(screen.queryByRole('header', { name: TITLE })).toBeNull();
    await user.press(screen.getByRole('tab', { name: '내 정보' }));
    await pass(500);
    expect(screen.getByRole('switch', { name: SWITCH })).not.toBeChecked();
  }, 180_000);
});
