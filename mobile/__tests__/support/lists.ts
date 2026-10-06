import { fireEvent, type screen as Screen } from '@testing-library/react-native';
import { screen } from './app';

// What a screen reader says for the controls that the `Main` frame puts around the map.
export const FRIEND_PILL = '친구 목록 열기';
export const FOLD_FRIENDS = '친구 목록 접기';
export const UNFOLD_FRIENDS = '친구 목록 펼치기';
export const FOLD_QUESTS = '퀘스트 목록 접기';
export const UNFOLD_QUESTS = '퀘스트 목록 펼치기';
export const FULL_SCREEN = '퀘스트 전체 화면으로 열기';
export const FOOTPRINTS = '오늘의 발자국 재생 · 친구들의 오늘 스토리';
export const ACTIVE_PARTY = '활성 파티 AI 커리어 설명회 같이 가요 열기';
export const LAYERS = '편의기능 (식당 · 셔틀버스)';
export const AI_INPUT = 'AI에게 메시지';
export const SEND = '보내기';

// The rows of the two lists.
export const FRIEND_ROW = '김민준 지도에서 보기';
export const FRIEND_ROW_OFF = '서지우 지도에서 보기';
export const CLASS_ROW = '다음 강의 · 23분 후 · 자료구조 · 14:00 · 301동 118호';
export const PARTY_ROW = '공개 파티 · 활성화 중 · AI 커리어 설명회 같이 가요 · 17:40 · 301동 앞';
export const DINNER_ROW = '비공개 파티 · 김민준 · 저녁 약속 · 20:10 · 학생회관 (63동)';

export function button(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

export function findButton(name: string | RegExp): ReturnType<typeof screen.queryByRole> {
  return screen.queryByRole('button', { name });
}

type Found = ReturnType<typeof Screen.getByTestId>;

// The stage is laid out: the room between the status bar and the navigation, which the lists and the row of buttons
// fit themselves to. A test's status bar takes nothing.
export async function layStage(width: number, height: number): Promise<void> {
  await fireEvent(screen.getByTestId('over-map'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}

// An open card is laid out with this height.
export async function layCard(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('map-card'), 'layout', {
    nativeEvent: { layout: { x: 16, y: 0, width: 328, height } },
  });
}

// The box around a row, which carries the row's strength in its window.
export function boxOf(row: string): Found {
  const box = button(row).parent;
  if (box === null) {
    throw new Error(`The row "${row}" stands in no box`);
  }
  return box;
}

// The list is scrolled by this much.
export async function scroll(window: Found, y: number): Promise<void> {
  await fireEvent.scroll(window, { nativeEvent: { contentOffset: { x: 0, y } } });
}
