import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';

import type { LatLng } from '@/api/types';
import {
  CAMPUS_BOUNDS,
  Map,
  type MapAvatar,
  type MapCamera,
  type MapHandle,
  type MapMarker,
  type MapProps,
  MAX_ZOOM,
  MIN_ZOOM,
  unmadeImage,
} from '@/map';

export const GATE: LatLng = { latitude: 37.4499, longitude: 126.9525 };
export const LIBRARY: LatLng = { latitude: 37.4598, longitude: 126.9521 };

export const EVENT: MapMarker = {
  id: 'event:e1',
  name: 'AI 커리어 채용설명회',
  position: GATE,
  image: unmadeImage({ kind: 'official', form: 'pin' }),
  text: 'AI 커리어',
};

export const FRIEND: MapAvatar = {
  id: 'friend:f1',
  name: '김민준',
  position: LIBRARY,
  image: unmadeImage({ kind: 'person', id: 'f1', tone: 'free', name: '김민준', photo: null }),
  glideMs: 5000,
};

// What a screen gives the map when it shows nothing yet.
export const EMPTY: MapProps = {
  bounds: CAMPUS_BOUNDS,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM,
  markers: [],
  avatars: [],
  route: null,
};

// Gives the map the size of a phone's screen above a panel.
export async function layOutMap(width = 390, height = 700): Promise<void> {
  await fireEvent(screen.getByText('지도는 Android 빌드에서 보입니다'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height } },
  });
}

export interface HeldMap {
  onCameraIdle: jest.Mock<void, [MapCamera]>;
  // What the map last said about its camera.
  camera: () => MapCamera | undefined;
  move: (use: (map: MapHandle) => void) => Promise<void>;
}

// A map as a screen holds it: by a handle, and told when the camera stops.
export async function holdMap(props: Partial<MapProps> = {}): Promise<HeldMap> {
  const ref = createRef<MapHandle>();
  const onCameraIdle = jest.fn<void, [MapCamera]>();
  await render(<Map {...EMPTY} {...props} onCameraIdle={onCameraIdle} ref={ref} />);
  await layOutMap();
  return {
    onCameraIdle,
    camera: () => onCameraIdle.mock.lastCall?.[0],
    move: async (use): Promise<void> => {
      await act(() => {
        if (ref.current !== null) {
          use(ref.current);
        }
      });
    },
  };
}
