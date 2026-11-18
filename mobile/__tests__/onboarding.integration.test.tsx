/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { fireEvent, userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import {
  arriveAtOnboarding,
  FROM_ACCOUNT,
  button,
  chooseDepartment,
  ONBOARDING,
  SAVE,
  saveOnboarding,
} from './support/onboarding';
import { readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
const SUGGESTION = { name: '홍길동', department: '컴퓨터공학부' };

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the name and the department that the account gives', () => {
  it('are shown fixed, with the line that says where they come from, and need nothing more', async () => {
    await arriveAtOnboarding(SUGGESTION);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동');
    expect(screen.getByLabelText('이름')).toBeDisabled();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
    expect(screen.getByLabelText('학과')).toBeDisabled();
    expect(screen.getByText(FROM_ACCOUNT)).toBeVisible();
    expect(screen.queryByRole('radio', { name: '학부생' })).toBeNull();
    expect(button(SAVE)).toBeEnabled();
  });

  it('leave a department the account does not give to the User, from the list', async () => {
    await arriveAtOnboarding({ name: '홍길동', department: null });

    expect(screen.getByLabelText('이름')).toBeDisabled();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('');
    expect(screen.getByLabelText('학과')).toBeEnabled();
    expect(screen.getByText('이름은 SNU 계정에서 가져와요')).toBeVisible();
    expect(screen.getByRole('radio', { name: '학부생' })).toBeChecked();
    expect(button(SAVE)).toBeDisabled();
  });

  it("keep the account's department even when the list does not hold it, and ask for a name it lacks", async () => {
    await arriveAtOnboarding({ name: null, department: '마법학과' });

    expect(screen.getByLabelText('이름')).toHaveDisplayValue('');
    expect(screen.getByLabelText('이름')).toBeEnabled();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('마법학과');
    expect(screen.getByText('학과는 SNU 계정에서 가져와요')).toBeVisible();
  });

  it('leave both to the User when the account gives neither, with no line', async () => {
    await arriveAtOnboarding({ name: null, department: null });

    expect(screen.getByLabelText('이름')).toBeEnabled();
    expect(screen.getByLabelText('학과')).toBeEnabled();
    expect(screen.queryByText(/SNU 계정에서 가져와요/u)).toBeNull();
  });
});

describe('the save button', () => {
  it('is enabled once a name and a department are there', async () => {
    const user = await arriveAtOnboarding({ name: null, department: null });
    expect(button(SAVE)).toBeDisabled();

    await chooseDepartment(user, '컴퓨터', '컴퓨터공학부');
    expect(button(SAVE)).toBeDisabled();

    await user.type(screen.getByLabelText('이름'), '   ');
    expect(button(SAVE)).toBeDisabled();

    await user.type(screen.getByLabelText('이름'), '김샤');
    expect(button(SAVE)).toBeEnabled();

    await user.press(button('학과 지우기'));
    expect(button(SAVE)).toBeDisabled();
  });

  it('saves the answers on the phone and shows the main screen', async () => {
    const user = await arriveAtOnboarding({ name: ' 홍길동 ', department: null });
    await saveOnboarding(user);
    await pass(600);

    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect(screen.queryByRole('header', { name: ONBOARDING })).toBeNull();
    expect(await readKept()).toMatchObject({
      onboardingCompleted: true,
      suggestion: null,
      answers: {
        name: '홍길동',
        department: '컴퓨터공학부',
        admissionYear: null,
        hashtags: [],
        courseLevel: 'undergraduate',
        gender: null,
      },
    });
  });

  it('says so when the save failed, and leaves the form as it is', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'completeOnboarding';
    const user = await arriveAtOnboarding({ name: '홍길동', department: null });
    await saveOnboarding(user);

    expect(screen.getByText('저장하지 못했어요. 다시 시도해 주세요')).toBeVisible();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
    expect(button(SAVE)).toBeEnabled();
    expect((await readKept()).onboardingCompleted).toBe(false);
  });
});

describe('a save, asked for', () => {
  it('that failed says so above the foot, clear of its buttons', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'completeOnboarding';
    const user = await arriveAtOnboarding(SUGGESTION);
    await fireEvent(screen.getByTestId('onboarding-foot'), 'layout', { nativeEvent: { layout: { height: 132 } } });
    await user.press(button(SAVE));
    await pass(400);

    expect(screen.getByTestId('toast-layer')).toHaveStyle({ bottom: 132 + 24 });
  });

  it('counts the name by characters and takes thirty, an emoji being one', async () => {
    await arriveAtOnboarding({ name: null, department: null });
    await fireEvent.changeText(screen.getByLabelText('이름'), '😀'.repeat(31));

    expect(screen.getByLabelText('이름')).toHaveDisplayValue('😀'.repeat(30));
    expect(screen.getByText('30/30')).toBeVisible();
  });
});

describe('around Onboarding', () => {
  it('is not shown again when the app starts after a save', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.press(button(SAVE));
    await pass(1000);
    await screen.unmount();

    await startApp();
    expect(screen.getByRole('progressbar')).toBeVisible();
    await pass(1000);
    expect(screen.getByRole('tab', { name: '지도' })).toBeVisible();
    expect(screen.queryByRole('header', { name: ONBOARDING })).toBeNull();
  });

  it('signs the User out on "로그아웃", back to the sign-in screen', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.press(button('로그아웃'));
    await pass(100);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(await readKept()).toMatchObject({ signedIn: false, suggestion: null, onboardingCompleted: false });
  });

  it('has nothing behind it to go back to after a sign-in and the consent', async () => {
    await startApp();
    await pass(600);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.press(button(SIGN_IN));
    await pass(400);
    await user.press(button('동의하고 시작'));
    await pass(100);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.queryByRole('button', { name: /뒤로|닫기/u })).toBeNull();
    expect(router.canGoBack()).toBe(false);
  });

  it('cannot be reached by a User who is not signed in', async () => {
    await startApp('/onboarding');
    await pass(600);

    expect(screen.getByRole('button', { name: SIGN_IN })).toBeVisible();
    expect(screen.queryByRole('header', { name: ONBOARDING })).toBeNull();
  });
});
