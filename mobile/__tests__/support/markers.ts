/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type userEvent, within } from '@testing-library/react-native';
import { screen } from './app';

// What a screen reader says for the things of the `Main` frame on the map: a button of the plain ground each.
export const FRIEND = '김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요';
export const OTHER_FRIEND = '박지호 · 공강 · 자하연 근처 · 14:30까지 비어 있어요';
export const MEMBER = '오현우 · 활성 파티 멤버 · 위치 공유 중';
export const EVENT = '공식 행사 · AI 커리어 설명회';
export const PARTY = '파티 · AI 커리어 설명회 같이 가요';
export const DINNER = '파티 · 저녁 약속';

export const ROUTE = '경로가 그려져 있습니다';
export const CLOSER = '가까이 보기';
export const NOT_READY = '준비 중이에요';

type User = ReturnType<typeof userEvent.setup>;

export function marker(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

// The look a marker is drawn with: the plain ground names it as the marker's `testID`.
export function lookOf(name: string): unknown {
  return marker(name).props.testID;
}

// The words the map writes under a marker, or null. A card may show the same words.
export function wordsUnder(name: string, words: string): unknown {
  const drawn = marker(name).parent;
  return drawn === null ? null : within(drawn).queryByText(words);
}

export async function press(user: User, name: string): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
}

// Presses of the zoom in button from the whole campus: two reach the "pins" level of detail, three the "names" one.
export async function zoomIn(user: User, presses: number): Promise<void> {
  for (let done = 0; done < presses; done += 1) {
    // One press after the other, as a User presses.
    // oxlint-disable-next-line no-await-in-loop
    await user.press(screen.getByRole('button', { name: '확대' }));
  }
}
