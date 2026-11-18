/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { pass, screen } from './support/app';
import { startFresh } from './support/mocks';
import { arriveAtOnboarding, button, SAVE, type User } from './support/onboarding';
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
