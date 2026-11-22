/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { LatLng } from '@/api/types';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { AI_INPUT } from './lists';
import { openMain } from './main';

// The answer drawn on the map (P02 ticket 02), against the fake main server.

export const ASKED = '배고파, 민수랑 같이';

// The names a screen reader says for the marks of the first Plan of the stored answer to "배고파, 민수랑 같이".
export const FIRST_PLAN_MARKS = [
  '나 · 3분',
  '민수',
  '302동식당 · 12:15 점심',
  '후보 2 · 301동식당 · 12:18',
  '후보 3 · 학생회관식당 · 12:33',
  '후보 4 · 3식당 · 12:31',
  '후보 5 · 자하연식당 2층 · 12:35',
  '13:00 수업 · 24동',
];

type User = Awaited<ReturnType<typeof openMain>>;

// Starts the app and asks; the main server answers with `reply`.
export async function askOnMap(
  server: FakeServer,
  reply: object,
  before?: (user: User) => Promise<void>,
): Promise<User> {
  server.on('POST /assistant/messages', { status: 200, body: reply });
  const user = await openMain();
  await before?.(user);
  await user.type(screen.getByLabelText(AI_INPUT), ASKED);
  await user.press(screen.getByRole('button', { name: '보내기' }));
  await pass(500);
  return user;
}

const NOT_A_THING = new Set(['경로가 그려져 있습니다', '지도 데이터 출처 보기']);

// What a screen reader says for each marker and Avatar on the plain ground, sorted.
export function mapThings(): string[] {
  const map = within(screen.getByTestId('main-map-touches'));
  return [...map.queryAllByRole('button'), ...map.queryAllByRole('image')]
    .map((found): unknown => found.props.accessibilityLabel)
    .filter((name): name is string => typeof name === 'string' && !NOT_A_THING.has(name))
    .toSorted();
}

// The ids of the lines on the plain ground, sorted.
export function mapLines(): string[] {
  return screen
    .queryAllByTestId(/^line:/u)
    .map((line): unknown => line.props.testID)
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.slice('line:'.length))
    .toSorted();
}

export function card(): ReturnType<typeof within> {
  return within(screen.getByTestId('answer-card'));
}

// The time bar under the pill, which holds the answer's band (P04 ticket 01).
export function timeBar(): ReturnType<typeof within> {
  return within(screen.getByTestId('time-bar'));
}

export async function layAnswerCard(height: number): Promise<void> {
  await fireEvent(screen.getByTestId('answer-card'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height } },
  });
}

// Each position once, in an order of its own, to compare sets of points.
export function distinct(points: readonly LatLng[]): string[] {
  return [...new Set(points.map(({ latitude, longitude }) => `${latitude},${longitude}`))].toSorted();
}
