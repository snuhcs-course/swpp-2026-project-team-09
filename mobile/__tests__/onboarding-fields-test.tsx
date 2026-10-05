import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { startFresh } from './support/mocks';
import { arriveAtOnboarding, button, chooseDepartment, SAVE, type User } from './support/onboarding';
import type { OnboardingAnswers } from '@/api/types';
import { readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SUGGESTION = { name: '홍길동', department: '컴퓨터공학부' };
const INTEREST = '관심사 추가';

async function saved(user: User): Promise<OnboardingAnswers | null> {
  await user.press(button(SAVE));
  await pass(400);
  const { answers } = await readKept();
  return answers;
}

async function addInterest(user: User, typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText(INTEREST), typed);
  await user.press(button('추가'));
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

describe('the interests', () => {
  it('are shown with a "#" and stored without, with no whitespace and none twice whatever the case', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(button('추가')).toBeDisabled();

    await addInterest(user, '#AI 커리어');
    await addInterest(user, 'ai커리어');
    await addInterest(user, '러 닝');
    await addInterest(user, '#');

    expect(screen.getByText('#AI커리어')).toBeVisible();
    expect(screen.getByText('2/20')).toBeVisible();
    expect(await saved(user)).toMatchObject({ hashtags: ['AI커리어', '러닝'] });
  });

  it('are thirty characters long at most', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await fireEvent.changeText(screen.getByLabelText(INTEREST), `#${'가'.repeat(40)}`);

    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue(`#${'가'.repeat(30)}`);
    await user.press(button('추가'));
    expect(await saved(user)).toMatchObject({ hashtags: ['가'.repeat(30)] });
  });
});

describe('the interests, suggested and counted', () => {
  it('are added from the suggested ones with a press, and removed with the ×', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(screen.queryByRole('button', { name: '#클라이밍 추가' })).toBeNull();

    await user.press(button('#러닝 추가'));
    await user.press(button('#재즈 추가'));
    expect(screen.queryByRole('button', { name: '#러닝 추가' })).toBeNull();
    expect(button('#클라이밍 추가')).toBeVisible();

    await user.press(button('#러닝 삭제'));
    expect(button('#러닝 추가')).toBeVisible();
    expect(await saved(user)).toMatchObject({ hashtags: ['재즈'] });
  });

  it('are twenty at most', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    for (let count = 1; count <= 20; count += 1) {
      // oxlint-disable-next-line no-await-in-loop -- one interest after the other, as a User adds them
      await addInterest(user, `관심${count}`);
    }
    expect(screen.getByText('20/20')).toBeVisible();
    expect(screen.getByText('추천')).toBeVisible();
    expect(screen.queryByRole('button', { name: '#러닝 추가' })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText(INTEREST), '하나더');
    expect(button('추가')).toBeDisabled();
    const answers = await saved(user);
    expect(answers?.hashtags).toHaveLength(20);
    expect(answers?.hashtags.at(-1)).toBe('관심20');
  });
});
