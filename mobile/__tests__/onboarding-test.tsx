import { router } from 'expo-router';
import { fireEvent, userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './support/app';
import { startFresh } from './support/mocks';
import {
  arriveAtOnboarding,
  BADGE,
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

describe('what the sign-in suggested', () => {
  it('fills in the name and the department, each with its badge', async () => {
    await arriveAtOnboarding(SUGGESTION);

    expect(screen.getByRole('header', { name: ONBOARDING })).toBeVisible();
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
    expect(screen.getAllByText(BADGE)).toHaveLength(2);
    expect(screen.getByRole('radio', { name: '학부생' })).toBeChecked();
    expect(button(SAVE)).toBeEnabled();
  });

  it('keeps a badge until the User changes that field', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);

    await user.type(screen.getByLabelText('이름'), '님');
    expect(screen.getByLabelText('이름')).toHaveDisplayValue('홍길동님');
    expect(screen.getAllByText(BADGE)).toHaveLength(1);

    await user.press(button('학과 지우기'));
    expect(screen.queryByText(BADGE)).toBeNull();
  });

  it('leaves the department empty when the suggestion has none', async () => {
    await arriveAtOnboarding({ name: '홍길동', department: null });

    expect(screen.getByLabelText('학과')).toHaveDisplayValue('');
    expect(screen.getAllByText(BADGE)).toHaveLength(1);
    expect(button(SAVE)).toBeDisabled();
  });

  it('leaves a department that is not in the list empty, and a name it lacks too', async () => {
    await arriveAtOnboarding({ name: null, department: '마법학과' });

    expect(screen.getByLabelText('이름')).toHaveDisplayValue('');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('');
    expect(screen.queryByText(BADGE)).toBeNull();
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

    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
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
    await arriveAtOnboarding(SUGGESTION);
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
    expect(screen.getByRole('header', { name: '메인' })).toBeVisible();
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
