/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass } from './app';
import { button } from './lists';
import { openMain } from './main';
import { answered } from './mocks';
import { apiClient } from '@/api/client';

// The 새내기 튜토리얼 on the main screen: its buttons and rows by their names, a 26학번 User, who is eligible by
// default, and the progress the main server's mock already holds.

export const START = '새내기 튜토리얼 시작하기';
export const PREVIOUS = '이전 퀘스트';
export const NEXT = '다음 퀘스트';
export const SHEET = '새내기 튜토리얼 퀘스트';
export const S_CARD_ROW = '새내기 튜토리얼 · 1/5 · 학생증(S-CARD) 발급받기 · 완료 조건 · 학생증 받기';
export const SHUTTLE_ROW = '새내기 튜토리얼 · 2/5 · 행정관 셔틀 이용하기 · 완료 조건 · 행정관 셔틀 타 보기';
export const KWANJEONG_ROW =
  '새내기 튜토리얼 · 3/5 · 관정도서관 예약하기 · 완료 조건 · 관정도서관 열람실이나 스터디룸 예약 및 이용';

export type User = Awaited<ReturnType<typeof openMain>>;

export function openAsFreshman(): Promise<User> {
  return openMain({
    answers: {
      name: '홍길동',
      department: '컴퓨터공학부',
      admissionYear: 2026,
      hashtags: [],
      courseLevel: 'undergraduate',
      gender: null,
    },
  });
}

// Presses a button and lets the mock answer.
export async function pressAndWait(user: User, name: string): Promise<void> {
  await user.press(button(name));
  await pass(500);
}

// The quests the main server already holds as started.
export async function started(...keys: string[]): Promise<void> {
  for (const key of keys) {
    // oxlint-disable-next-line no-await-in-loop
    await answered(apiClient.startTutorialQuest(key));
  }
}

// The quests the main server already holds as completed, each by its kind's own way.
export async function completed(...keys: string[]): Promise<void> {
  for (const key of keys) {
    // oxlint-disable-next-line no-await-in-loop
    await answered(apiClient.startTutorialQuest(key));
    // oxlint-disable-next-line no-await-in-loop
    await answered(apiClient.completeTutorialQuest(key, key === 'kwanjeong' ? 'skipped' : 'button'));
  }
}

// A started quest's sheet, opened from its row on the main screen.
export async function openSheet(key: string, row: string): Promise<User> {
  await started(key);
  const user = await openAsFreshman();
  await user.press(button(row));
  await pass(500);
  return user;
}
