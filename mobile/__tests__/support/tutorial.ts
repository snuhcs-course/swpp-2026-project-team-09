/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass, screen } from './app';
import { button } from './lists';
import { openMain } from './main';
import { answered } from './mocks';
import { apiClient } from '@/api/client';
import { TUTORIAL_CATEGORIES, TUTORIAL_CONTENT } from '@/api/mock/data/tutorial';
import { MOCK_TUTORIAL_SWITCHES } from '@/api/mock/tutorial';

// The 새내기 튜토리얼 on the main screen: its buttons and rows by their names, a 26학번 User, who is eligible by
// default, and the progress the main server's mock already holds.

export const START = '새내기 튜토리얼 시작하기';
export const SHEET = '새내기 튜토리얼 퀘스트';
export const LIST = '새내기 튜토리얼';
export const TO_LIST = '튜토리얼 목록으로';

// Every quest's key, in `order`.
export const QUEST_KEYS = TUTORIAL_CONTENT.map(({ key }) => key);

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

// The quests the main server already holds as completed, each by its kind's own way, as the mock serves it.
export async function completed(...keys: string[]): Promise<void> {
  for (const key of keys) {
    // oxlint-disable-next-line no-await-in-loop
    await answered(apiClient.startTutorialQuest(key));
    // oxlint-disable-next-line no-await-in-loop
    await answered(
      apiClient.completeTutorialQuest(
        key,
        key === 'kwanjeong' && MOCK_TUTORIAL_SWITCHES.kwanjeongCheck ? 'skipped' : 'button',
      ),
    );
  }
}

// A quest's row in the list, by its title and its status, as a screen reader reads it.
export function rowName(key: string, status: '' | ' · 진행 중' | ' · 완료' = ''): string {
  const quest = TUTORIAL_CONTENT.find((one) => one.key === key);
  return `${quest?.title ?? key}${status}`;
}

// The start button, then the quest's category's tab: the list on the quest's row.
export async function openListAt(user: User, key: string): Promise<void> {
  await pressAndWait(user, START);
  const category = TUTORIAL_CONTENT.find((one) => one.key === key)?.category;
  const label = TUTORIAL_CATEGORIES.find((one) => one.key === category)?.label ?? '';
  await user.press(screen.getByRole('tab', { name: label }));
}

// A started quest's sheet, as the main server without guides serves the tutorial: opened from its row in the list.
export async function openSheet(key: string): Promise<User> {
  MOCK_TUTORIAL_SWITCHES.guides = false;
  await started(key);
  const user = await openAsFreshman();
  await openListAt(user, key);
  await pressAndWait(user, rowName(key, ' · 진행 중'));
  return user;
}

// A quest's guide, opened from its row in the list.
export async function openGuide(key: string): Promise<User> {
  const user = await openAsFreshman();
  await openListAt(user, key);
  await pressAndWait(user, rowName(key));
  return user;
}
