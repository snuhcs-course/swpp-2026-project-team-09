/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PrivateZone } from '@/api/private-zone-types';
import type { LatLng } from '@/api/types';
import { atPoint, type Point } from '@/map';
import { pass, screen } from './app';
import { ON_CAMPUS, openMain } from './main';
import { BUILDING_301, offset, squareRound } from './zone-shapes';

// The zone screen, "비공개 구역" (P02 ticket 29), over the fake main server: its map laid out, and a finger drawing on
// it while the pencil is on.

export const ZONES_ROUTE = 'GET /users/me/private-zones';
export const ADD_ROUTE = 'POST /users/me/private-zones';

export const SCREEN_LINE = '칠한 곳 안의 위치는 저장하지 않아요. 친구에게는 시간표만 보여요.';
export const FIVE_AT_MOST = '5곳까지 그릴 수 있어요';
export const BIGGER = '조금 더 크게 둘러 주세요';
export const SAVED = '저장했어요 · 이 안에서는 친구에게 시간표만 보여요';

const MAP_SIZE = { width: 390, height: 480 };
// The screen opens on the User, close enough to draw round a building.
const OPENED = { centre: ON_CAMPUS, zoom: 17 };

export function zone(index: number, label: string): PrivateZone {
  return {
    id: `7a2c4e6f-0000-4a5b-8c9d-00000000000${String(index)}`,
    label,
    outline: squareRound(offset(BUILDING_301, 100 * index, 0), 40),
    createdAt: '2026-11-16T03:00:00.000Z',
  };
}

export async function openZones(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await act(() => {
    router.push('/me/private-zones');
  });
  await pass(500);
  const map = screen.getByTestId('zone-map');
  const layout = { nativeEvent: { layout: { x: 0, y: 0, ...MAP_SIZE } } };
  await fireEvent(map, 'layout', layout);
  await fireEvent(within(map).getByText('지도는 Android·iOS 빌드에서 보입니다'), 'layout', layout);
  return user;
}

export function pencil(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('switch', { name: '그리기' });
}

// A loop of that many points round a point of the map's view, each far enough from the last to be kept.
export function loop(middle: Point, radius: number, points: number): Point[] {
  return Array.from({ length: points }, (_, index) => {
    const angle = (2 * Math.PI * index) / points;
    return { x: middle.x + radius * Math.cos(angle), y: middle.y + radius * Math.sin(angle) };
  });
}

// One finger down at the path's first point, along it, and up at its last.
export async function draw(path: readonly Point[]): Promise<void> {
  await act(() => {
    fireGestureHandler(
      getByGestureTestId('zone-drawing'),
      path.map(({ x, y }) => ({ x, y })),
    );
  });
}

// The outline sent for a path drawn on the opened map, which keeps every point of it.
export function outlineOf(path: readonly Point[]): LatLng[] {
  return path.map((point) => atPoint(point, OPENED, MAP_SIZE));
}
