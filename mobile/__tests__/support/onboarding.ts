/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './app';
import type { Suggestion } from '@/api/types';
import { keep } from '@/storage/kept';

// The Onboarding screen's title.
export const ONBOARDING = '프로필 만들기';
export const SAVE = '저장하고 시작하기';
export const BADGE = 'Google 계정에서 가져옴';

export type User = ReturnType<typeof userEvent.setup>;

export function button(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

// Starts the app for a User who signed in, agreed and has not finished Onboarding: the loading screen passes and
// Onboarding shows, filled in from the suggestion.
export async function arriveAtOnboarding(suggestion: Suggestion): Promise<User> {
  await keep({ signedIn: true, consented: true, onboardingCompleted: false, suggestion });
  await startApp();
  await pass(600);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

// Searches the department's list for the words and chooses the department.
export async function chooseDepartment(user: User, words: string, department: string): Promise<void> {
  await user.type(screen.getByLabelText('학과'), words);
  await user.press(button(department));
}

// Fills in what Onboarding needs beyond the suggested name, a department, and saves.
export async function saveOnboarding(user: User): Promise<void> {
  await chooseDepartment(user, '컴퓨터', '컴퓨터공학부');
  await user.press(button(SAVE));
  await pass(400);
}
