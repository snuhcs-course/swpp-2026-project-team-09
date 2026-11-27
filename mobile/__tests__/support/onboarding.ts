/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { userEvent } from '@testing-library/react-native';
import { pass, screen, startApp } from './app';
import type { Suggestion } from '@/api/types';
import { keep } from '@/storage/kept';

// The Onboarding screen's title.
export const ONBOARDING = '프로필 만들기';
export const SAVE = '저장하고 시작하기';
// The grey line under the name and the department, which come from the SNU account.
export const FROM_ACCOUNT = '이름과 학과는 SNU 계정에서 가져와요';

export type User = ReturnType<typeof userEvent.setup>;

export function button(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

// Starts the app for a User who signed in, agreed and has not finished Onboarding: the loading screen passes and
// Onboarding shows, filled in from the suggestion.
export async function arriveAtOnboarding(suggestion: Suggestion): Promise<User> {
  await keep({ signedIn: true, consent: { version: 1, usage: false }, onboardingCompleted: false, suggestion });
  await startApp();
  await pass(600);
  return userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
}

// Saves Onboarding as it is: the account's name and department need nothing more.
export async function saveOnboarding(user: User): Promise<void> {
  await user.press(button(SAVE));
  await pass(400);
}
