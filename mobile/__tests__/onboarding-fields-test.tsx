// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { startFresh } from './support/mocks';
import { arriveAtOnboarding, BADGE, button, chooseDepartment, SAVE, type User } from './support/onboarding';
import type { OnboardingAnswers } from '@/api/types';
import { readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SUGGESTION = { name: '홍길동', department: '컴퓨터공학부' };

async function saved(user: User): Promise<OnboardingAnswers | null> {
  await user.press(button(SAVE));
  await pass(400);
  const { answers } = await readKept();
  return answers;
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the department', () => {
  it('is searched by its name or its college, spaces aside, and chosen with a press', async () => {
    const user = await arriveAtOnboarding({ name: '홍길동', department: null });

    await user.type(screen.getByLabelText('학과'), '정치 학');
    expect(button('정치외교학부 정치학전공')).toBeVisible();
    expect(screen.queryByRole('button', { name: '경제학부' })).toBeNull();

    await user.clear(screen.getByLabelText('학과'));
    await user.type(screen.getByLabelText('학과'), '간호대');
    expect(screen.getByRole('header', { name: '간호대학' })).toBeVisible();
    await user.press(button('간호학과'));

    expect(screen.getByLabelText('학과')).toHaveDisplayValue('간호학과');
    expect(screen.queryByRole('header', { name: '간호대학' })).toBeNull();
    expect(await saved(user)).toMatchObject({ department: '간호학과' });
  });

  it('says "결과 없음" for words that find nothing, and takes no words of the User as a department', async () => {
    const user = await arriveAtOnboarding({ name: '홍길동', department: null });
    await user.type(screen.getByLabelText('학과'), '마법학과');

    expect(screen.getByText('결과 없음')).toBeVisible();
    expect(button(SAVE)).toBeDisabled();
  });

  it('is cleared by another course level, which has its own list', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.press(screen.getByRole('radio', { name: '대학원생' }));

    expect(screen.getByRole('radio', { name: '대학원생' })).toBeChecked();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('');
    expect(button(SAVE)).toBeDisabled();

    await chooseDepartment(user, '인공', '인공지능');
    expect(await saved(user)).toMatchObject({ department: '인공지능', courseLevel: 'graduate' });
  });
});

describe('the department, left without a choice', () => {
  it('closes the list and shows the department it held, with its badge', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.type(screen.getByLabelText('학과'), '마법학과');
    expect(screen.getByText('결과 없음')).toBeVisible();

    await pass(300);
    expect(screen.queryByText('결과 없음')).toBeNull();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
    expect(screen.getAllByText(BADGE)).toHaveLength(2);
    expect(await saved(user)).toMatchObject({ department: '컴퓨터공학부' });
  });

  it('shows the held department again after a focus alone', async () => {
    await arriveAtOnboarding(SUGGESTION);
    await fireEvent(screen.getByLabelText('학과'), 'focus');
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('');
    expect(button('간호학과')).toBeVisible();

    await fireEvent(screen.getByLabelText('학과'), 'blur');
    await pass(300);
    expect(screen.queryByRole('button', { name: '간호학과' })).toBeNull();
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('컴퓨터공학부');
  });

  it('still takes a press on a row that began as the field lost the focus', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await fireEvent(screen.getByLabelText('학과'), 'focus');
    await fireEvent(screen.getByLabelText('학과'), 'blur');
    await pass(200);

    await user.longPress(button('간호학과'), { duration: 400 });
    await pass(300);
    expect(screen.getByLabelText('학과')).toHaveDisplayValue('간호학과');
    expect(screen.getAllByText(BADGE)).toHaveLength(1);
  });
});

describe('the admission year', () => {
  it('offers this year and the eleven before it, and stores the one chosen', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.press(screen.getByRole('combobox', { name: '학번' }));

    for (let year = 15; year <= 26; year += 1) {
      expect(button(`${year}학번`)).toBeVisible();
    }
    expect(screen.queryByRole('button', { name: '27학번' })).toBeNull();
    expect(screen.queryByRole('button', { name: '14학번' })).toBeNull();

    await user.press(button('22학번'));
    expect(screen.queryByRole('button', { name: '26학번' })).toBeNull();
    expect(await saved(user)).toMatchObject({ admissionYear: 2022 });
  });

  it('stores no year for "그 외"', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await user.press(screen.getByRole('combobox', { name: '학번' }));
    await user.press(button('그 외'));

    expect(screen.getByRole('combobox', { name: '학번' })).toHaveAccessibilityValue({ text: '그 외' });
    expect(await saved(user)).toMatchObject({ admissionYear: null });
  });
});

describe('the gender', () => {
  it('starts with no choice and stores the one pressed', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(screen.getByRole('radio', { name: '선택 안 함' })).toBeChecked();

    await user.press(screen.getByRole('radio', { name: '여성' }));
    expect(await saved(user)).toMatchObject({ gender: { kind: 'female' } });
  });

  it('takes words of the User\'s own for "직접 입력"', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(screen.queryByLabelText('성별 직접 입력')).toBeNull();

    await user.press(screen.getByRole('radio', { name: '직접 입력' }));
    await user.type(screen.getByLabelText('성별 직접 입력'), '논바이너리');
    expect(await saved(user)).toMatchObject({ gender: { kind: 'custom', text: '논바이너리' } });
  });
});
