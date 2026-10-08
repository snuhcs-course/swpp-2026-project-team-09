import { act, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import MapCheck from '@/app/map-check';
import type { LatLng } from '@/api/types';
import type { MapBounds, MapProps } from '@/map';
import { pass } from './support/app';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

// What each screen hands the map component, read off a native map that records it. The native modules' use of it
// is checked on a phone.

let mockHasNativeMap = true;
let mockShown: MapProps[] = [];

function MockNativeMap(props: MapProps): ReactElement {
  mockShown.push(props);
  return <Text>네이티브 지도</Text>;
}

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => mockHasNativeMap,
}));

jest.mock('@/map/native-map', (): { __esModule: true; default: (props: MapProps) => ReactElement } => ({
  __esModule: true,
  default: MockNativeMap,
}));

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

// The campus rectangle, 37.445 to 37.471 north and 126.945 to 126.963 east, widened by half its height (0.013) to
// the north and the south and by half its width (0.009) to the east and the west.
const CAMERA_AREA: MapBounds = { south: 37.432, west: 126.936, north: 37.484, east: 126.972 };
const ON_CAMPUS_RECTANGLE: MapBounds = { south: 37.445, west: 126.945, north: 37.471, east: 126.963 };

function expectCameraArea(props: MapProps | undefined): void {
  expect(props?.bounds.south).toBeCloseTo(CAMERA_AREA.south, 9);
  expect(props?.bounds.west).toBeCloseTo(CAMERA_AREA.west, 9);
  expect(props?.bounds.north).toBeCloseTo(CAMERA_AREA.north, 9);
  expect(props?.bounds.east).toBeCloseTo(CAMERA_AREA.east, 9);
  // The lowest zoom is still the one at which the view fits inside the campus rectangle.
  expect(props?.fitBounds).toEqual(ON_CAMPUS_RECTANGLE);
  // Kakao's SDK takes whole levels: pinching out stops at 15.
  expect(props?.nativeMinLevel).toBe(15);
}

beforeEach(async () => {
  mockHasNativeMap = true;
  mockShown = [];
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the area the camera may move over', () => {
  it("is wider than the campus on the main screen, and pinching out stops at Kakao's level 15", async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();

    expectCameraArea(mockShown.at(-1));
  });

  it('is the same on 장소 선택', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    mockShown = [];

    await act(() => {
      router.push('/place-map');
    });
    await pass(500);

    expectCameraArea(mockShown.at(-1));
  });

  it('lets 장소 선택 pick a point on campus only, though its camera may move past it', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();
    await act(() => {
      router.push('/place-map');
    });
    await pass(500);
    // The main screen's map, under it, shows the campus's places; 장소 선택's shows nothing but its own pin.
    const idle = (centre: LatLng): Promise<void> =>
      act(() => {
        mockShown.findLast(({ markers }) => markers.length === 0)?.onCameraIdle?.({ centre, zoom: 17 });
      });
    // The first stop sends the camera to the User's position, on campus, and the second stops there.
    await idle(ON_CAMPUS);
    await idle(ON_CAMPUS);
    await pass(500);
    expect(screen.getByRole('button', { name: '이 위치로 정하기' })).toBeEnabled();

    // Inside the camera's area, north of the on-campus rectangle.
    await idle({ latitude: 37.478, longitude: 126.954 });
    await pass(500);

    expect(screen.getByRole('button', { name: '이 위치로 정하기' })).toBeDisabled();
  });

  it('is the same on the map check', async () => {
    await render(<MapCheck />);

    expectCameraArea(mockShown.at(-1));
  });
});
